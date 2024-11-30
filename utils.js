//utils.js
// 이미지 로드 시간을 기록
function recordLoadTime() {
    return performance.now();
}

// 반응 시간 계산
function calculateResponseTime(loadTime, clickTime) {
    return (clickTime - loadTime) / 1000;
}

// 조합 생성 (키워드 or 이미지)
function generateCombinations(arr) {
    const result = [];
    for (let i = 0; i < arr.length - 1; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            result.push([arr[i], arr[j]]);
        }
    }
    return result.sort(() => Math.random() - 0.5); // 무작위 섞기
}

// 정규화 (반응시간 -> 점수)
function normalizeResponseTimes(times) {
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    if (minTime === maxTime) {
        return times.map(() => 1); // 모든 점수가 동일하면 1로 설정
    }

    return times.map(time => {
        return 1 + ((time - minTime) / (maxTime - minTime)) * 6;
    });
}

// 비교 행렬 생성 (클릭한 아이템에 k 입력, 클릭하지 않은 아이템에 1/k 입력)
function createComparisonMatrix(data, items, type) {
    const n = items.length;
    const matrix = Array.from({ length: n }, () => Array(n).fill(1));

    // 데이터 유형별 필드 매핑
    let left, right, selectedItem, time;

    if (type === "keywordResponseTimes") {
        left = "keyword1";
        right = "keyword2";
        selectedItem = "selectedKeyword";
        time = "responseTime";
    } else if (type === "imageResponseTimes") {
        left = "leftImage";
        right = "rightImage";
        selectedItem = "selectedImage";
        time = "responseTime";
    } else {
        console.error(`Invalid type: ${type}`);
        return matrix;
    }

    // 비교 행렬 작성
    data.forEach(entry => {
        const i = items.indexOf(entry[left]);
        const j = items.indexOf(entry[right]);
        const value = entry[time] || 1; // 기본값 처리
        const selected = entry[selectedItem];

        if (i !== -1 && j !== -1 && i !== j) {
            const score = selected === entry[left] ? value : 1 / value;
            matrix[i][j] = score;
            matrix[j][i] = 1 / score;
        }
    });

    return matrix;
}


// 고유벡터 계산
function calculateEigenvector(matrix) {
    const n = matrix.length;
    const rowProducts = matrix.map(row => row.reduce((acc, value) => acc * value, 1));
    const eigenvector = rowProducts.map(product => Math.pow(product, 1 / n));
    const sum = eigenvector.reduce((acc, value) => acc + value, 0);

    return eigenvector.map(value => value / sum); // 합계가 1이 되도록 정규화
}