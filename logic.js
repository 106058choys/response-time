// logic.js
// 키워드 로드
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

// 페이지 초기화
async function initializePage() {
    const currentPage = window.location.pathname;

    if (currentPage.includes("item_question.html")) {
        initializeItemQuestionPage();
    } else if (currentPage.includes("complete.html")) {
        initializeCompletePage();
    } else {
        await initializeIndexPage();
    }
}

// 키워드쌍 처리 로직
class KeywordManager {
    constructor(keywords) {
        this.keywordPairs = generateCombinations(keywords);
        this.currentPairIndex = 0;
        this.responseTimes = [];
    }

    hasNextPair() {
        return this.currentPairIndex < this.keywordPairs.length;
    }

    getNextPair() {
        return this.keywordPairs[this.currentPairIndex++];
    }

    recordResponse(keyword1, keyword2, selectedKeyword, startTime) {
        const responseTime = calculateResponseTime(startTime, recordLoadTime());
        this.responseTimes.push({ keyword1, keyword2, selectedKeyword, responseTime });
    }

    saveResponse() {
        localStorage.setItem("keywordResponseTimes", JSON.stringify(this.responseTimes));
    }
}

// index.html 초기화
async function initializeIndexPage() {
    const keywords = await loadKeywords();
    const manager = new KeywordManager(keywords);

    const keyword1Element = document.getElementById("keyword1");
    const keyword2Element = document.getElementById("keyword2");

    function displayNextPair() {
        if (manager.hasNextPair()) {
            const [keyword1, keyword2] = manager.getNextPair();
            keyword1Element.textContent = keyword1;
            keyword2Element.textContent = keyword2;
            window.keywordStartTime = recordLoadTime();
        } else {
            manager.saveResponse();
            window.location.href = "item_question.html";
        }
    }

    function handleKeywordClick(selectedKeyword) {
        manager.recordResponse(keyword1Element.textContent, keyword2Element.textContent, selectedKeyword, window.keywordStartTime);
        displayNextPair();
    }

    keyword1Element.addEventListener("click", () => handleKeywordClick(keyword1Element.textContent));
    keyword2Element.addEventListener("click", () => handleKeywordClick(keyword2Element.textContent));

    displayNextPair();
}

// item_question.html 초기화
async function initializeItemQuestionPage() {
    const leftImage = document.getElementById('leftImage');
    const rightImage = document.getElementById('rightImage');
    const imageResponseTimes = [];
    const images = ['image1.jpg', 'image2.jpg', 'image3.jpg', 'image4.jpg'];
    const imagePairs = generateCombinations(images);
    const keywords = await loadKeywords();

    let currentPairIndex = 0;
    let currentRound = 0;
    let imageLoadTime = 0;

    function displayNextImagePair() {
        const [leftSrc, rightSrc] = imagePairs[currentPairIndex];
        leftImage.src = `images/${leftSrc}`;
        rightImage.src = `images/${rightSrc}`;
        document.getElementById('keyword').innerText = keywords[currentRound];
        imageLoadTime = recordLoadTime();
    }

    function handleImageClick(selectedImage) {
        const responseTime = calculateResponseTime(imageLoadTime, recordLoadTime());
        const [leftSrc, rightSrc] = imagePairs[currentPairIndex];

        imageResponseTimes.push({
            responseTime,
            leftImage: leftSrc,
            rightImage: rightSrc,
            selectedImage,
            keyword: keywords[currentRound]
        });

        if (currentPairIndex < imagePairs.length - 1) {
            currentPairIndex++;
        } else if (currentRound < keywords.length - 1) {
            currentRound++;
            currentPairIndex = 0;
        } else {
            saveResults();
            return;
        }
        displayNextImagePair();
    }

    function saveResults() {
        localStorage.setItem('responseTimes', JSON.stringify(imageResponseTimes));
        localStorage.setItem('keywords', JSON.stringify(keywords));
        localStorage.setItem('images', JSON.stringify(images));
        window.location.href = 'complete.html';
    }

    leftImage.addEventListener("click", () => handleImageClick(leftImage.src.split("/").pop()));
    rightImage.addEventListener("click", () => handleImageClick(rightImage.src.split("/").pop()));

    displayNextImagePair(); // 첫 번째 이미지 페어 표시
}

async function initializeCompletePage() {
    const keywordResponseTimes = JSON.parse(localStorage.getItem("keywordResponseTimes") || "[]");
    const imageResponseTimes = JSON.parse(localStorage.getItem("responseTimes") || "[]");
    const keywords = JSON.parse(localStorage.getItem("keywords") || "[]");
    const images = JSON.parse(localStorage.getItem("images") || "[]");

    if (keywords.length === 0 || keywordResponseTimes.length === 0 || imageResponseTimes.length === 0 || images.length === 0) {
        console.warn("One or more data sets are missing!");
        return;
    }

    const keywordMatrix = createComparisonMatrix(keywordResponseTimes, keywords, "keywordResponseTimes")
    const keywordEigenvector = calculateEigenvector(keywordMatrix);

    const imageMatrices = {};
    const imageEigenvectors = {};
    keywords.forEach(keyword => {
        const keywordData = imageResponseTimes.filter(entry => entry.keyword === keyword);
        const matrix = createComparisonMatrix(keywordData, images, "imageResponseTimes");
        const eigenvector = calculateEigenvector(matrix);
        imageMatrices[keyword] = matrix;
        imageEigenvectors[keyword] = eigenvector;
    });

    const imageScores = images.map((image, imageIndex) => {
        return keywords.reduce((total, keyword, kIndex) => {
            const value = imageEigenvectors[keyword]?.[imageIndex] || 0;
            const weight = keywordEigenvector[kIndex] || 0;
            return total + value * weight;
        }, 0);
    });

    document.getElementById('downloadXlsxBtn').addEventListener('click', () => {
        const wb = XLSX.utils.book_new();
    
        // 1. Unified Data 시트 데이터 배열
        const unifiedSheetData = [];
    
        // 1-1. Keyword Comparison Matrix
        unifiedSheetData.push(["Keyword Comparison Matrix"]);
        unifiedSheetData.push(["", ...keywords, "Eigenvector"]);
        keywordMatrix.forEach((row, i) => {
            unifiedSheetData.push([keywords[i], ...row, keywordEigenvector[i]]);
        });
    
        unifiedSheetData.push([]); // 빈 줄 (가독성 확보)
    
        // 1-2. Image Comparison Matrices
        unifiedSheetData.push(["Image Comparison Matrix"]);
        keywords.forEach(keyword => {
            unifiedSheetData.push([`Comparison Matrix for ${keyword}`]);
            unifiedSheetData.push(["", ...images, "Eigenvector"]);
            const matrix = imageMatrices[keyword];
            const eigenvector = imageEigenvectors[keyword];
            matrix.forEach((row, i) => {
                unifiedSheetData.push([images[i], ...row, eigenvector[i]]);
            });
            unifiedSheetData.push([]);
        });

        // 1-3. Image Scores
        unifiedSheetData.push(["Image Scores"]);
        unifiedSheetData.push([
            "Image",
            ...keywords.flatMap(keyword => [`Value for ${keyword}`, `Weight for ${keyword}`]),
            "Score"
        ]);
        images.forEach((image, imgIndex) => {
            const row = [image];
            keywords.forEach((keyword, kIndex) => {
                const value = imageEigenvectors[keyword]?.[imgIndex] || 0;
                const weight = keywordEigenvector[kIndex] || 0;
                row.push(value, weight);
            });
            row.push(imageScores[imgIndex]);
            unifiedSheetData.push(row);
        });

        const unifiedSheet = XLSX.utils.aoa_to_sheet(unifiedSheetData);
        XLSX.utils.book_append_sheet(wb, unifiedSheet, "Unified Data");
    
        // 2. Raw Data 시트 데이터 배열
        const rawDataSheetData = [];
    
        // 2-1. Response Times: Keyword 생성
        rawDataSheetData.push(["Response Times: Keyword"]);
        rawDataSheetData.push(["Response Time(s)", "Keyword1", "Keyword2", "Selected Keyword"]);
        keywordResponseTimes.forEach(entry => {
            rawDataSheetData.push([
                entry.responseTime.toFixed(4) || "N/A",
                entry.keyword1 || "N/A",
                entry.keyword2 || "N/A",
                entry.selectedKeyword || "N/A"
            ]);
        });
    
        rawDataSheetData.push([]);
    
        // 2-2. Response Times: Images by Keyword 생성
        rawDataSheetData.push(["Response Times: Images by Keyword"]);
        rawDataSheetData.push(["Response Time(s)", "Left Image", "Right Image", "Selected Image", "Keyword"]);
        imageResponseTimes.forEach(entry => {
            rawDataSheetData.push([
                entry.responseTime.toFixed(4) || "N/A",
                entry.leftImage || "N/A",
                entry.rightImage || "N/A",
                entry.selectedImage || "N/A",
                entry.keyword || "N/A"
            ]);
        });
    
        const rawDataSheet = XLSX.utils.aoa_to_sheet(rawDataSheetData);
        XLSX.utils.book_append_sheet(wb, rawDataSheet, "Raw Data");
    
        // 파일 저장
        XLSX.writeFile(wb, 'result_data.xlsx');
    });
}

// DOMContenLoaded 이벤트로 초기화 시작
window.addEventListener("DOMContentLoaded", initializePage);