//utils.js

// 이미지 로드 시간을 기록
function recordLoadTime() {
    return performance.now();
}

// 반응 시간을 계산
function calculateResponseTime(loadTime, clickTime) {
    return clickTime - loadTime;
}

// 이미지 조합 생성
function generateCombinations(arr) {
    const result = [];
    for (let i = 0; i < arr.length - 1; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            result.push([arr[i], arr[j]]);
        }
    }
    return result.sort(() => Math.random() - 0.5); // 이미지 조합을 섞음
}

function normalizeResponseTimes(times) {
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    if (minTime === maxTime) {
        return times.map(() => 1);
    }

    return times.map(time => {
        return 1 + ((time - minTime) / (maxTime - minTime)) * 6;
    })
}

function createComparisonMatrix(data, items, dataType) {
    const n = items.length;
    const matrix = Array.from({ length: n }, () => Array(n).fill(1)); // 기본값 모두 1로 초기화

    if (dataType === "responseTime") {
        const groupedByKeyword = data.reduce((acc, entry) => {
            if (!acc[entry.keyword]) acc[entry.keyword] = [];
            acc[entry.keyword].push(entry);
            return acc;
        }, {});

        Object.keys(groupedByKeyword).forEach(keyword => {
            const group = groupedByKeyword[keyword];
            const times = group.map(entry => entry.responseTime);
            const normalizedScores = normalizeResponseTimes(times);

            group.forEach((entry, idx) => {
                const { leftImage: image1, rightImage: image2, selectedImage } = entry;
                if (!image1 || !image2 || !selectedImage) return;

                const i = items.indexOf(image1);
                const j = items.indexOf(image2);

                if (i !== -1 && j !== -1) {
                    let score = normalizedScores[idx];
                    if (!isNaN(score) || score !== 0) {
                        if (i !== j) {
                            if (selectedImage === image1) {
                                matrix[i][j] = score;
                                matrix[j][i] = 1 / score;
                            } else if (selectedImage === image2) {
                                matrix[i][j] = score;
                                matrix[j][i] = 1 / score;
                            }
                        }
                    }
                }
            });
        });
    } else if (dataType === "weight") {
        data.forEach(entry => {
            const i = items.indexOf(entry.keyword1);
            const j = items.indexOf(entry.keyword2);

            if (i !== -1 && j !== -1 && i !== j) {
                const k1Weight = entry.k1Weight;
                const k2Weight = entry.k2Weight;

                if (k1Weight && k2Weight && !isNaN(k1Weight) && !isNaN(k2Weight)) {
                    matrix[i][j] = k1Weight;
                    matrix[j][i] = k2Weight;
                } else {
                    console.warn(`Invalid weight values for ${entry.keyword1} and ${entry.keyword2}`);
                }
            }
        });
    }

    return matrix;
}

function calculateEigenvector(matrix) {
    const n = matrix.length;
    let rowProducts = new Array(n).fill(1);

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            rowProducts[i] *= matrix[i][j];
        }
    }

    let eigenvector = rowProducts.map(product => Math.pow(product, 1 / n));

    const sum = eigenvector.reduce((acc, value) => acc + value, 0);
    eigenvector = eigenvector.map(value => value / sum);

    return eigenvector;
}