const canvas = document.getElementById('orchardCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const bgm = document.getElementById('bgm');
const video = document.getElementById('video');
const modal = document.getElementById('cameraModal');

let fruits = [];

// 1. 기본 설정
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function startOrchard() {
    document.getElementById('entryOverlay').style.display = 'none';
    bgm.play().catch(() => console.log("재생 권한 필요"));
    document.getElementById('audioBtn').innerText = "🔊 소리 켬";
}

// 🍎 열매 클래스 (대롱대롱 매달려 좌우로 흔들리는 효과)
// ORCHARD.js 내 Fruit 클래스 수정
// ORCHARD.js 내 Fruit 클래스 수정
class Fruit {
    constructor(img) {
        this.img = img;
        this.size = 70 + Math.random() * 40;
        this.x = (canvas.width * 0.15) + Math.random() * (canvas.width * 0.7); 
        this.y = (canvas.height * 0.35) + Math.random() * (canvas.height * 0.3); 
        
        // 흔들림 속성
        this.angle = Math.random() * Math.PI * 2;
        this.swingSpeed = 0.015 + Math.random() * 0.015;
        this.range = 0.08 + Math.random() * 0.1;

        // 🍎 낙하 속성 추가
        this.isFalling = false;
        this.vy = 0; // 수직 속도
        this.gravity = 0.5; // 중력 세기
        this.bounce = 0.3; // 땅에 닿았을 때 튕기는 정도
        this.ground = canvas.height * 0.82; // 잔디 부분 높이 (이미지에 맞춰 조정)
    }

    update() {
        if (this.isFalling) {
            // 떨어지는 중력 로직
            this.vy += this.gravity;
            this.y += this.vy;

            // 땅(잔디)에 닿았을 때
            if (this.y + this.size > this.ground) {
                this.y = this.ground - this.size;
                this.vy *= -this.bounce; // 톡! 하고 튀어오름
                
                // 속도가 아주 작아지면 멈춤
                if (Math.abs(this.vy) < 1) {
                    this.vy = 0;
                    this.isFalling = false; // 떨어지는 상태 종료 (땅에 고정)
                }
            }
        } else if (this.y < canvas.height * 0.7) { 
            // 땅에 닿기 전(나무에 매달린 상태)에만 살랑살랑 흔들림
            this.angle += this.swingSpeed;
        }
    }

    draw() {
        ctx.save();
        if (this.y + this.size < this.ground - 5) {
            // 나무에 매달려 있거나 공중에 있을 때만 회전(흔들림) 적용
            ctx.translate(this.x + this.size / 2, this.y);
            ctx.rotate(Math.sin(this.angle) * this.range);
            ctx.drawImage(this.img, -this.size / 2, 0, this.size, this.size);
        } else {
            // 땅에 떨어졌을 때는 똑바로 서있기
            ctx.drawImage(this.img, this.x, this.y, this.size, this.size);
        }
        ctx.restore();
    }
}

// --- [공통 이미지 처리 로직] ---
async function processImage(dataUrl) {
    showLoading(true, "열매 열리는 중...");
    const base64Content = dataUrl.split(',')[1];
    try {
        const response = await fetch('/.netlify/functions/get-fish-data', { // 기존 넷리파이 함수 재사용
            method: 'POST',
            body: JSON.stringify({ imageContent: base64Content })
        });
        const data = await response.json();
        const objects = data.responses[0].localizedObjectAnnotations;
        // 과수원이니 'Fruit', 'Food', 'Apple' 등을 찾거나 기본 첫번째 물체 추출
        const obj = objects ? objects[0] : null;

        if (obj) {
            extractFruit(dataUrl, obj.boundingPoly.normalizedVertices);
        } else {
            addPlainFruit(dataUrl); // AI 감지 실패 시에도 배경제거 로직 포함
        }
    } catch (err) {
        console.error("AI 처리 실패, 기본 추가로 전환:", err);
        addPlainFruit(dataUrl);
    }
}

// 누끼 따기 (AI가 감지한 물체 추출)
function extractFruit(src, vertices) {
    const tempImg = new Image();
    tempImg.src = src;
    tempImg.onload = () => {
        const tempCanvas = document.createElement('canvas');
        const tCtx = tempCanvas.getContext('2d');
        const x = vertices[0].x * tempImg.width;
        const y = vertices[0].y * tempImg.height;
        const w = (vertices[2].x - vertices[0].x) * tempImg.width;
        const h = (vertices[2].y - vertices[0].y) * tempImg.height;
        tempCanvas.width = w; tempCanvas.height = h;
        tCtx.drawImage(tempImg, x, y, w, h, 0, 0, w, h);
        
        removeBackground(tempCanvas, tCtx); // 배경 제거 (흰색)
        
        const fruitImg = new Image();
        fruitImg.src = tempCanvas.toDataURL();
        fruitImg.onload = () => { fruits.push(new Fruit(fruitImg)); showLoading(false); };
    };
}

// 🍎 문제 1 대안 해결: AI 실패 시에도 흰색 배경을 제거하는 로직 추가
function addPlainFruit(src) {
    const tempImg = new Image();
    tempImg.src = src;
    tempImg.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = tempImg.width; tempCanvas.height = tempImg.height;
        const tCtx = tempCanvas.getContext('2d');
        tCtx.drawImage(tempImg, 0, 0);
        
        removeBackground(tempCanvas, tCtx); // 배경 제거 (흰색)
        
        const fruitImg = new Image();
        fruitImg.src = tempCanvas.toDataURL();
        fruitImg.onload = () => { fruits.push(new Fruit(fruitImg)); showLoading(false); };
    };
}

// 배경 제거 (흰색 영역 투명화) 공통 함수
function removeBackground(canvas, ctx) {
    const imgData = ctx.getImageData(0,0, canvas.width, canvas.height);
    for(let i=0; i<imgData.data.length; i+=4) {
        // 흰색에 가까운 색 (220 이상)을 발견하면 투명하게 (data[i+3]=0) 만듭니다.
        if(imgData.data[i]>220 && imgData.data[i+1]>220 && imgData.data[i+2]>220) imgData.data[i+3]=0;
    }
    ctx.putImageData(imgData, 0, 0);
}

// --- [카메라/파일/UI 로직] ---
async function openCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream; modal.style.display = 'flex';
    } catch (err) { alert("카메라를 켤 수 없어요!"); }
}
function takeSnapshot() {
    const cap = document.getElementById('captureCanvas');
    cap.width = video.videoWidth; cap.height = video.videoHeight;
    cap.getContext('2d').drawImage(video, 0, 0);
    processImage(cap.toDataURL('image/jpeg'));
    closeCamera();
}
function closeCamera() {
    if (video.srcObject) video.srcObject.getTracks().forEach(t => t.stop());
    modal.style.display = 'none';
}
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => processImage(e.target.result);
    reader.readAsDataURL(file);
}
function toggleAudio() {
    if (bgm.paused) { bgm.play(); document.getElementById('audioBtn').innerText = "🔊 소리 켬"; }
    else { bgm.pause(); document.getElementById('audioBtn').innerText = "🔇 소리 끔"; }
}
function clearOrchard() { fruits = []; }
function showLoading(show, msg) {
    const el = document.getElementById('customAlert');
    document.getElementById('alertMessage').innerText = msg;
    el.classList.toggle('show', show);
}

// 🖥️ 문제 4 해결: 크게 보기 시 UI 사라지게 하기 (수족관과 동일 로직)
// ORCHARD.js 내 전체화면 관련 함수 수정
// 🖥️ 전체화면 토글
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`전체화면 오류: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

// 🌓 전체화면 상태 변화 감지
document.addEventListener('fullscreenchange', () => {
    const ui = document.getElementById('uiPanel');
    if (document.fullscreenElement) {
        // 전체화면 진입 시 2초 뒤에 자동으로 처음 한 번 숨기기
        window.uiTimeout = setTimeout(() => {
            ui.style.opacity = "0";
            ui.style.pointerEvents = "none";
        }, 2000);
    } else {
        // 해제 시 즉시 나타남
        clearTimeout(window.uiTimeout);
        ui.style.opacity = "1";
        ui.style.pointerEvents = "auto";
    }
});

// 🖱️ 마우스 움직임 감지 로직 강화
window.addEventListener('mousemove', (e) => {
    if (document.fullscreenElement) {
        const ui = document.getElementById('uiPanel');
        
        // 마우스가 움직이면 일단 보여줌
        ui.style.opacity = "1";
        ui.style.pointerEvents = "auto";
        
        clearTimeout(window.uiTimeout);
        
        // 🛑 마우스가 UI 패널(버튼 박스) 위에 있을 때는 숨기지 않음
        // 마우스가 패널 밖에 있을 때만 3초 뒤에 숨김
        const rect = ui.getBoundingClientRect();
        const isOverPanel = (
            e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom
        );

        if (!isOverPanel) {
            window.uiTimeout = setTimeout(() => {
                if (document.fullscreenElement) {
                    ui.style.opacity = "0";
                    ui.style.pointerEvents = "none";
                }
            }, 3000); 
        }
    }
});

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fruits.forEach(f => { f.update(); f.draw(); });
    requestAnimationFrame(animate);
}
animate();
// 열매 클릭 감지
canvas.addEventListener('mousedown', (e) => {
    // 캔버스 내 마우스 좌표 계산
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 생성된 열매들을 확인 (나중에 생긴 열매가 위에 있으므로 역순으로 확인)
    for (let i = fruits.length - 1; i >= 0; i--) {
        const f = fruits[i];
        // 열매의 범위 안에 마우스가 있는지 확인
        if (mouseX > f.x && mouseX < f.x + f.size &&
            mouseY > f.y && mouseY < f.y + f.size) {
            
            // 이미 떨어지는 중이 아닐 때만 낙하 시작!
            if (!f.isFalling) {
                f.isFalling = true;
                f.vy = 2; // 처음 떨어질 때 살짝 힘을 줌
                break; // 한 번에 하나만 떨어뜨리기
            }
        }
    }
});