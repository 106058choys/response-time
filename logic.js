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

// 페이지 초기화
async function initializePage() {
    const currentPage = window.location.pathname;

    if (currentPage.includes("complete.html")) {
        initializeCompletePage();
    } else if (currentPage.includes("item_question.html")) {
        initializeItemQuestionPage();
    } else if (currentPage.includes("keyword_start.html")) {
        initializeKeywordStartPage();
    } else if (currentPage.includes("keyword_question.html")) {
        initializeKeywordQuestionPage();
    } else {
        await initializeIndexPage();
    }
}

// index.html 초기화
async function initializeIndexPage() {
    document.addEventListener("DOMContentLoaded", () => {
        const titleElement = document.getElementById('title');
        const descriptionElement = document.getElementById('description');

        if (titleElement && descriptionElement) {
            titleElement.textContent = '구매 기준 가중치 평가';
            descriptionElement.textContent = "내용을 입력해 주세요.";
        } else {
            console.error('Required elements are missing in index.html');
        }
    });
}

// keyword_question.html 초기화
async function initializeKeywordQuestionPage() {
    const keywords = await loadKeywords();
    if (keywords.length === 0) {
        console.error("No keywords found.");
        document.getElementById('keyword1').textContent = "키워드가 없습니다.";
        document.getElementById('keyword2').textContent = "관리자에게 문의하세요.";
        return;
    }

    // 키워드 쌍 생성 및 표시
    const keywordPairs = generateCombinations(keywords);
    let currentPairIndex = 0;
    let isProcessing = false; // 중복 처리 방지 플래그

    function displayNextKeywordPair() {
        if (currentPairIndex >= keywordPairs.length) {
            // 모든 키워드 쌍이 끝났으면 keyword_start.html로 이동
            window.location.href = "keyword_start.html";
            return;
        }

        const [keyword1, keyword2] = keywordPairs[currentPairIndex];
        document.getElementById('keyword1').textContent = keyword1;
        document.getElementById('keyword2').textContent = keyword2;

        window.startTime = recordLoadTime();
    }

    // 키워드 클릭 이벤트
    function handleKeywordClick(selectedKeyword) {
        if (isProcessing) return;
        isProcessing = true;
        
        // 현재 키워드 쌍의 선택 결과 기록
        const [keyword1, keyword2] = keywordPairs[currentPairIndex];
        const clickTime = recordLoadTime();
        const responseTime = calculateResponseTime(window.startTime || clickTime, clickTime);

        // 기록 저장
        const responseTimes = JSON.parse(localStorage.getItem('keywordResponseTimes') || '[]');

        const isDuplicate = responseTimes.some(
            (entry) => entry.keyword1 === keyword1 && entry.keyword2 === keyword2 && entry.selectedKeyword === selectedKeyword
        );

        if (!isDuplicate) {
            responseTimes.push({
                keyword1,
                keyword2,
                selectedKeyword,
                responseTime
            });
            localStorage.setItem('keywordResponseTimes', JSON.stringify(responseTimes));
        }

        // 다음 키워드 쌍으로 이동
        currentPairIndex++;
        displayNextKeywordPair();
        
        isProcessing = false;
    }

    // 이벤트 리스너 초기화
    document.getElementById('keyword1').addEventListener.onclick = null;
    document.getElementById('keyword2').addEventListener.onclick = null;

    // 이벤트 리스너 추가
    document.getElementById('keyword1').addEventListener('click', () => handleKeywordClick(document.getElementById('keyword1').textContent));
    document.getElementById('keyword2').addEventListener('click', () => handleKeywordClick(document.getElementById('keyword2').textContent));

    // 첫 번째 키워드 쌍 표시
    displayNextKeywordPair();
}

async function initializeKeywordStartPage() {
    const keywords = await loadKeywords();
    const currentKeywordIndex = parseInt(localStorage.getItem('currentKeywordIndex') || '0', 10);

    if (currentKeywordIndex >= keywords.length) {
        window.location.href = 'complete.html';
        return;
    }

    const currentKeyword = keywords[currentKeywordIndex] || '키워드';
    document.getElementById('keyword-message').textContent = `"${currentKeyword}"에 대해 측정을 시작합니다.`;
    document.getElementById('start-button').addEventListener('click', () => {
        window.location.href = 'item_question.html';
    });
}

// item_question.html 초기화
async function initializeItemQuestionPage() {
    const leftImage = document.getElementById('leftImage');
    const rightImage = document.getElementById('rightImage');
    const imageResponseTimes = JSON.parse(localStorage.getItem('responseTimes') || '[]');
    const images = ['image1.jpg', 'image2.jpg', 'image3.jpg', 'image4.jpg'];
    const imagePairs = generateCombinations(images);
    const keywords = await loadKeywords();

    let currentPairIndex = 0;
    let currentKeywordIndex = parseInt(localStorage.getItem("currentKeywordIndex") || "0", 10);
    let imageLoadTime = 0;

    function displayNextImagePair() {
        const [leftSrc, rightSrc] = imagePairs[currentPairIndex];
        leftImage.src = `images/${leftSrc}`;
        rightImage.src = `images/${rightSrc}`;
        document.getElementById('keyword').innerText = keywords[currentKeywordIndex];
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
            keyword: keywords[currentKeywordIndex]
        });

        if (currentPairIndex < imagePairs.length - 1) {
            // 현재 키워드의 다음 이미지 쌍으로 이동
            currentPairIndex++;
        } else if (currentKeywordIndex < keywords.length - 1) {
            // 다음 키워드로 이동
            currentKeywordIndex++;
            localStorage.setItem("currentKeywordIndex", currentKeywordIndex);
            localStorage.setItem("responseTimes", JSON.stringify(imageResponseTimes));
            window.location.href = "keyword_start.html";
            return;
        } else {
            saveResults(imageResponseTimes, keywords, images);
            return;
        }
        displayNextImagePair();
    }

    leftImage.addEventListener("click", () => handleImageClick(leftImage.src.split("/").pop()));
    rightImage.addEventListener("click", () => handleImageClick(rightImage.src.split("/").pop()));

    displayNextImagePair(); // 첫 번째 이미지 페어 표시
}

function saveResults(imageResponseTimes, keywords, images) {
    localStorage.setItem('responseTimes', JSON.stringify(imageResponseTimes));
    localStorage.setItem('keywords', JSON.stringify(keywords));
    localStorage.setItem('images', JSON.stringify(images));
    window.location.href = 'complete.html';
}

function restartTest() {
    localStorage.clear();
    window.location.href = "index.html";
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

    document.getElementById('restartTestBtn').addEventListener('click', restartTest);
}

// DOMContenLoaded 이벤트로 초기화 시작
window.addEventListener("DOMContentLoaded", initializePage);