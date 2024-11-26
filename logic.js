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

        document.getElementById('downloadXlsxBtn').addEventListener('click', function () {
            const wb = XLSX.utils.book_new();
        
            // Unified Data 시트 데이터 배열
            const unifiedSheetData = [];
        
            // Unified Data 시트 생성
            unifiedSheetData.push(["Weight Matrix"]);
            unifiedSheetData.push(["", ...keywords, "Eigenvector"]);
            const weightMatrix = createComparisonMatrix(weights, keywords, "weight");
            const weightEigenvector = calculateEigenvector(weightMatrix);
            weightMatrix.forEach((row, i) => {
                unifiedSheetData.push([keywords[i], ...row, weightEigenvector[i]]);
            });
        
            unifiedSheetData.push([]); // 빈 줄
        
            unifiedSheetData.push(["Response Matrices"]);
            const keywordResponseEigenvector = [];
            keywords.forEach(keyword => {
                unifiedSheetData.push([`Keyword: ${keyword}`]);
                unifiedSheetData.push(["", "Image 1", "Image 2", "Image 3", "Image 4", "Eigenvector"]);
        
                const keywordData = responseTimes.filter(time => time.keyword === keyword);
                const responseMatrix = createComparisonMatrix(keywordData, images, "responseTime");
                const responseEigenvector = calculateEigenvector(responseMatrix);
                keywordResponseEigenvector.push(responseEigenvector);
        
                responseMatrix.forEach((row, i) => {
                    unifiedSheetData.push([`Image ${i + 1}`, ...row, responseEigenvector[i]]);
                });
        
                unifiedSheetData.push(["Eigenvector", ...responseEigenvector]);
                unifiedSheetData.push([]);
            });
        
            unifiedSheetData.push(["Image Scores"]);
            unifiedSheetData.push(["Image", ...keywords.flatMap(keyword => [keyword, `${keyword} 가중치`]), "Score"]);
        
            images.forEach((_, imgIndex) => {
                const keywordFields = keywords.flatMap((_, keywordIndex) => {
                    const responseValue = keywordResponseEigenvector[keywordIndex]?.[imgIndex] || 0;
                    const weightValue = weightEigenvector[keywordIndex] || 0;
                    return [responseValue, weightValue];
                });
        
                const totalScore = keywords.reduce((sum, _, keywordIndex) => {
                    const responseValue = keywordResponseEigenvector[keywordIndex]?.[imgIndex] || 0;
                    const weightValue = weightEigenvector[keywordIndex] || 0;
                    return sum + responseValue * weightValue;
                }, 0);
        
                unifiedSheetData.push([`Image ${imgIndex + 1}`, ...keywordFields, totalScore]);
            });
        
            const unifiedSheet = XLSX.utils.aoa_to_sheet(unifiedSheetData);
            XLSX.utils.book_append_sheet(wb, unifiedSheet, "Unified Data");
        
            // Raw Data 시트 데이터 배열
            const rawDataSheetData = [];
        
            // Raw Data 시트 생성
            rawDataSheetData.push(["Keyword Weights"]);
            rawDataSheetData.push(["Keyword 1", "K1 Weight", "Keyword 2", "K2 Weight"]);
            weights.forEach(entry => {
                rawDataSheetData.push([entry.keyword1, entry.k1Weight, entry.keyword2, entry.k2Weight]);
            });
        
            rawDataSheetData.push([]); // 빈 줄 (가독성 확보)
        
            rawDataSheetData.push(["Response Times"]);
            rawDataSheetData.push(["Response Time(s)", "Left Image", "Right Image", "Selected Image", "Keyword"]);
            responseTimes.forEach(entry => {
                rawDataSheetData.push([entry.responseTime, entry.leftImage, entry.rightImage, entry.selectedImage, entry.keyword]);
            });
        
            rawDataSheetData.push([]); // 빈 줄 (가독성 확보)
        
            const rawDataSheet = XLSX.utils.aoa_to_sheet(rawDataSheetData);
            XLSX.utils.book_append_sheet(wb, rawDataSheet, "Raw Data");
        
            // 파일 저장
            XLSX.writeFile(wb, 'result_data.xlsx');
        });        
    }
});