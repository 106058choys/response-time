// logic.js
async function loadKeywords() {
    try {
        const response = await fetch('data/keywords.txt');
        const text = await response.text();
        return text.split(',').map(keyword => keyword.trim());
    } catch (error) {
        console.error('Failed to load keywords:', error);
        return [];
    }
}

window.addEventListener('DOMContentLoaded', async function() {
    const currentPage = window.location.pathname;

    // index.html에서 실행되는 코드
    if (currentPage.includes('index.html')) {
        const keywords = await loadKeywords();
        let keywordPairs = generateCombinations(keywords);
        let weights = [];
        let currentPairIndex = 0;

        // 키워드 페어를 화면에 표시
        displayKeywordPair();

        // 가중치 선택 이벤트 리스너 등록
        document.querySelectorAll('input[name="weight"]').forEach(radio => {
            radio.addEventListener('click', function() {
                console.log('Weight clicked:', radio.vaule);
                handleWeightSubmit();
            });
        });

        function handleWeightSubmit() {
            const selectedWeight = document.querySelector('input[name="weight"]:checked');
            
            if (selectedWeight) {
                const weightValue = parseInt(selectedWeight.value, 10);
                const [keyword1, keyword2] = keywordPairs[currentPairIndex];

                const k1Weight = weightValue < 0 ? Math.abs(weightValue) : 1 / Math.abs(weightValue);
                const k2Weight = weightValue > 0 ? Math.abs(weightValue) : 1 / Math.abs(weightValue);

                weights.push({
                    keyword1,
                    k1Weight,
                    keyword2,
                    k2Weight
                });

                currentPairIndex++;
                if (currentPairIndex < keywordPairs.length) {
                    displayKeywordPair();
                } else {
                    saveWeightsAndProceed();
                }
            } else {
                alert("가중치를 선택해 주세요.");
            }
        }

        function displayKeywordPair() {
            const [keyword1, keyword2] = keywordPairs[currentPairIndex];
            document.getElementById('keyword1').innerText = keyword1;
            document.getElementById('keyword2').innerText = keyword2;

            const radioButtons = document.querySelectorAll('input[name="weight"]');
            radioButtons.forEach(button => button.checked = false);
        }

        function saveWeightsAndProceed() {
            localStorage.setItem('weights', JSON.stringify(weights));
            window.location.href = 'item_question.html';
        }
    }

    // item_question.html에서 실행되는 코드
    if (currentPage.includes('item_question.html')) {
        const leftImage = document.getElementById('leftImage');
        const rightImage = document.getElementById('rightImage');
        let currentRound = 0;
        let currentPairIndex = 0;
        let imageLoadTime = 0;
        const responseTimes = [];
        const images = ['image1.jpg', 'image2.jpg', 'image3.jpg', 'image4.jpg'];
        const imagePairs = generateCombinations(images);
        const keywords = await loadKeywords();

        if (leftImage && rightImage) {
            leftImage.addEventListener('click', (event) => handleImageClick(event));
            rightImage.addEventListener('click', (event) => handleImageClick(event));
        }

        function displayNextImagePair() {
            const [leftSrc, rightSrc] = imagePairs[currentPairIndex];
            leftImage.src = 'images/' + leftSrc;
            rightImage.src = 'images/' + rightSrc;
            document.getElementById('keyword').innerText = keywords[currentRound];
            imageLoadTime = performance.now();
        }

        function handleImageClick(event) {
            const clickTime = performance.now();
            const responseTime = (clickTime - imageLoadTime) / 1000;
            const [leftSrc, rightSrc] = imagePairs[currentPairIndex];
            const selectedImage = event.target.id === 'leftImage' ? leftSrc : rightSrc;

            responseTimes.push({
                responseTime,
                leftImage: leftSrc,
                rightImage: rightSrc,
                selectedImage: selectedImage,
                keyword: keywords[currentRound]
            });

            console.log("Response Times Data:", responseTimes);

            if (currentPairIndex < imagePairs.length - 1) {
                currentPairIndex++;
                displayNextImagePair();
            } else {
                if (currentRound < keywords.length - 1) {
                    currentRound++;
                    currentPairIndex = 0;
                    displayNextImagePair();
                } else {
                    saveResults();
                }
            }
        }

        function saveResults() {
            localStorage.setItem('responseTimes', JSON.stringify(responseTimes));
            localStorage.setItem('keywords', JSON.stringify(keywords));
            localStorage.setItem('images', JSON.stringify(images));
            window.location.href = 'complete.html';
        }

        displayNextImagePair(); // 첫 번째 이미지 페어 표시
    }

    // complete.html에서 실행되는 코드
    if (currentPage.includes('complete.html')) {
        const storedWeights = localStorage.getItem('weights');
        const weights = storedWeights ? JSON.parse(storedWeights) : [];
        console.log("Loaded Weights:", weights);

        const storedResponseTimes = localStorage.getItem('responseTimes');
        const responseTimes = storedResponseTimes ? JSON.parse(storedResponseTimes) : [];
        console.log("Loaded Response Times:", responseTimes);

        const storedKeywords = localStorage.getItem('keywords');
        const keywords = storedKeywords ? JSON.parse(storedKeywords) : await loadKeywords();
        console.log("Loaded Keywords:", keywords);

        const storedImages = localStorage.getItem('images');
        const images = storedImages ? JSON.parse(storedImages) : [];
        console.log("Loaded Images:", images);

        if (!keywords || keywords.length === 0) {
            console.warn("Keywords data is empty or undefined:", keywords);
        }
        if (!weights || weights.length === 0) {
            console.warn("Weights data is empty or undefined:", weights);
        }

        const weightsMatrix = createComparisonMatrix(weights, keywords, "weight");
        console.log("Weights Matrix:", weightsMatrix);

        const keywordEigenvector = calculateEigenvector(weightsMatrix);
        console.log("Keyword Eigenvector:", keywordEigenvector);

        const keywordResponseEigenvector = keywords.map((keyword) => {
            const keywordData = responseTimes.filter(time => time.keyword === keyword);
            const responseMatrix = createComparisonMatrix(keywordData, images, "responseTime");

            return calculateEigenvector(responseMatrix);
        });

        const imageScores = images.map((_, imgIndex) => {
            return keywordResponseEigenvector.reduce((score, eigenvector, keywordIndex) => {
                return score + eigenvector[imgIndex] * keywordEigenvector[keywordIndex];
            }, 0);
        });

        document.getElementById('downloadXlsxBtn').addEventListener('click', function() {
            const wb = XLSX.utils.book_new()
            
            // 1st 시트 - 키워드별 가중치
            const weightSheetData = [["Keyword 1", "K1 Weight", "Keyword 2", "K2 Weight"]];
            weights.forEach(entry => {
                weightSheetData.push([entry.keyword1, entry.k1Weight, entry.keyword2, entry.k2Weight]);
            });
            const ws1 = XLSX.utils.aoa_to_sheet(weightSheetData);
            XLSX.utils.book_append_sheet(wb, ws1, "Keyword Weight");

            // 2nd 시트 - 키워드별 이미지 응답 시간
            const responseSheetData = [["Response Time(s)", "Left Image", "Right Image", "Selected Image", "Keyword"]];
            responseTimes.forEach(entry => {
                responseSheetData.push([entry.responseTime, entry.leftImage, entry.rightImage, entry.selectedImage, entry.keyword]);
            });
            const ws2 = XLSX.utils.aoa_to_sheet(responseSheetData);
            XLSX.utils.book_append_sheet(wb, ws2, "Response Data");

            // 3rd 시트 - 키워드 및 이미지의 eigenvector
            const eigenvectorSheetData = [["Keyword/Image", "Eigenvector"]];
            keywordEigenvector.forEach((value, index) => {
                eigenvectorSheetData.push([`Keyword ${index + 1}`, value]);
            });
            keywordResponseEigenvector.forEach((eigenvector, index) => {
                eigenvector.forEach((value, imgIndex) => {
                    eigenvectorSheetData.push([`Image ${imgIndex + 1} (Keyword ${index + 1})`, value]);
                });
            });
            const ws3 = XLSX.utils.aoa_to_sheet(eigenvectorSheetData);
            XLSX.utils.book_append_sheet(wb, ws3, "Eigenvectors");

            // 4th 시트 - 각 이미지의 최종 imageScore
            const imageScoresSheetData = [["Image", "Score"]];
            imageScores.forEach((score, index) => {
                imageScoresSheetData.push([`Image ${index + 1}`, score]);
            });
            const ws4 = XLSX.utils.aoa_to_sheet(imageScoresSheetData);
            XLSX.utils.book_append_sheet(wb, ws4, "Image Scores");

            XLSX.writeFile(wb, 'result_data.xlsx');
        });
    }
});