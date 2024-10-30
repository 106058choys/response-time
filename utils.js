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
    const matrix = Array.from({ length: n }, () => Array(n).fill(1));

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

                if (!image1 || !image2 || !selectedImage) {
                    console.warn(`Invalid entry detected: ${JSON.stringify(entry)}`);
                    return; // 누락된 속성이 있는 경우 해당 항목을 건너뜀
                }

                const i = items.indexOf(image1);
                const j = items.indexOf(image2);

                if (i !== -1 && j !== -1) {
                    const score = normalizedScores[idx];

                    if (isNaN(score)) {
                        console.warn(`NaN detected in normalizedScores for entry: ${JSON.stringify(entry)}`);
                        return;
                    }

                    if (selectedImage === image1) {
                        matrix[i][j] = score;
                        matrix[j][i] = 1 / score;
                    } else if (selectedImage === image2) {
                        matrix[j][i] = score;
                        matrix[i][j] = 1 / score;
                    }
                } else {
                    console.warn(`Invalid index for images: ${image1}, ${image2}`);
                }
            });
        });
    } else if (dataType === "weight") {
        data.forEach(entry => {
            const i = items.indexOf(entry.keyword1);
            const j = items.indexOf(entry.keyword2);
            if (i !== -1 && j !== -1) {
                matrix[i][j] = entry.weight;
                matrix[j][i] = 1 / entry.weight;
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
            if (isNaN(matrix[i][j]) || matrix[i][j] === 0) {
                console.warn(`NaN or zero detected in matrix at position [${i}][${j}], setting to 1`);
                matrix[i][j] = 1;
            }
            rowProducts[i] *= matrix[i][j];
        }
    }

    let eigenvector = rowProducts.map(product => Math.pow(product, 1 / n));

    const sum = eigenvector.reduce((acc, value) => acc + value, 0);
    eigenvector = eigenvector.map(value => value / sum);

    return eigenvector;
}

function convertToCSV(data) {
    const headers = ['Response Time(s)', 'Left Image', 'Right Image', 'Keyword'];
    const rows = data.map(item => [
        item.responseTime.toFixed(3),  // 소수점 3자리로 반응 시간 표시
        item.leftImage,                // 왼쪽 이미지 이름
        item.rightImage,               // 오른쪽 이미지 이름
        item.keyword                   // 해당 키워드
    ]);

    let csvContent = headers.join(",") + "\n";  // 헤더 행 추가
    rows.forEach(row => {
        csvContent += row.join(",") + "\n";     // 각 행 추가
    });

    return csvContent;
}