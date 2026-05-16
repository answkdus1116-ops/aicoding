const canvas = document.getElementById('aquariumCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const bgm = document.getElementById('bgm');
const video = document.getElementById('video');
const modal = document.getElementById('cameraModal');

let fishes = [];

// 1. 기본 설정
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// AQUARIUM.js 수정 부분

function startAquarium() {
    const bgm = document.getElementById('bgm');
    const audioBtn = document.getElementById('audioBtn');
    
    // 1. 입장 화면 숨기기
    document.getElementById('entryOverlay').style.display = 'none';
    
    // 2. 노래 재생 (에러 방지 로직 포함)
    bgm.volume = 0.6; // 너무 클 수 있으니 60% 볼륨
    bgm.play()
        .then(() => {
            console.log("Suno AI 노래 재생 시작!");
            audioBtn.innerText = "🔊 소리 켬";
        })
        .catch(error => {
            console.error("자동 재생 차단됨:", error);
            alert("소리를 재생하려면 브라우저 상단 권한을 허용하거나 다시 클릭해 주세요.");
            audioBtn.innerText = "🔇 소리 끔";
        });
}

// 소리 끄고 켜는 버튼 기능
function toggleAudio() {
    const bgm = document.getElementById('bgm');
    const btn = document.getElementById('audioBtn');
    if (bgm.paused) {
        bgm.play();
        btn.innerText = "🔊 소리 켬";
    } else {
        bgm.pause();
        btn.innerText = "🔇 소리 끔";
    }
}

// 2. 물고기 클래스
class Fish {
    constructor(img) {
        this.img = img;
        this.size = 100 + Math.random() * 80;
        this.x = Math.random() * (canvas.width - this.size);
        this.y = Math.random() * (canvas.height - this.size);
        this.speedX = (Math.random() - 0.5) * 4;
        this.speedY = (Math.random() - 0.5) * 2.5;
        this.flip = this.speedX > 0;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x <= 0 || this.x >= canvas.width - this.size) { this.speedX *= -1; this.flip = !this.flip; }
        if (this.y <= 0 || this.y >= canvas.height - this.size) { this.speedY *= -1; }
    }
    draw() {
        ctx.save();
        if (this.flip) {
            ctx.translate(this.x + this.size, this.y);
            ctx.scale(-1, 1);
            ctx.drawImage(this.img, 0, 0, this.size, this.size);
        } else {
            ctx.drawImage(this.img, this.x, this.y, this.size, this.size);
        }
        ctx.restore();
    }
}

// 3. 사진 처리 핵심 로직 (파일 추가 및 카메라 공통)
async function processImage(dataUrl) {
    showLoading(true, "물고기 변신 중...");
    const base64Content = dataUrl.split(',')[1];
    
    try {
        const response = await fetch('/.netlify/functions/get-fish-data', {
            method: 'POST',
            body: JSON.stringify({ imageContent: base64Content })
        });
        const data = await response.json();
        const objects = data.responses[0].localizedObjectAnnotations;
        const fishObject = objects ? objects.find(obj => obj.name === 'Fish' || obj.name === 'Animal') || objects[0] : null;

        if (fishObject) {
            extractFishAndAdd(dataUrl, fishObject.boundingPoly.normalizedVertices);
        } else {
            addPlainFishWithBgRemoval(dataUrl);
        }
    } catch (err) {
        console.error("AI 처리 실패, 기본 추가로 전환:", err);
        addPlainFishWithBgRemoval(dataUrl);
    }
}

// 4. 배경 제거 및 캔버스 추가
function extractFishAndAdd(src, vertices) {
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
        
        const imgData = tCtx.getImageData(0,0,w,h);
        for(let i=0; i<imgData.data.length; i+=4) {
            if(imgData.data[i]>230 && imgData.data[i+1]>230 && imgData.data[i+2]>230) imgData.data[i+3]=0;
        }
        tCtx.putImageData(imgData, 0, 0);

        const fishImg = new Image();
        fishImg.src = tempCanvas.toDataURL();
        fishImg.onload = () => { fishes.push(new Fish(fishImg)); showLoading(false); };
    };
}

function addPlainFishWithBgRemoval(src) {
    const tempImg = new Image();
    tempImg.src = src;
    tempImg.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = tempImg.width; tempCanvas.height = tempImg.height;
        const tCtx = tempCanvas.getContext('2d');
        tCtx.drawImage(tempImg, 0, 0);
        const imgData = tCtx.getImageData(0,0,tempCanvas.width, tempCanvas.height);
        for(let i=0; i<imgData.data.length; i+=4) {
            if(imgData.data[i]>220 && imgData.data[i+1]>220 && imgData.data[i+2]>220) imgData.data[i+3]=0;
        }
        tCtx.putImageData(imgData, 0, 0);
        const fishImg = new Image();
        fishImg.src = tempCanvas.toDataURL();
        fishImg.onload = () => { fishes.push(new Fish(fishImg)); showLoading(false); };
    };
}

// 5. 카메라 제어
async function openCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" }, audio: false 
        });
        video.srcObject = stream;
        modal.style.display = 'flex';
    } catch (err) {
        alert("카메라를 켤 수 없어요! 브라우저 설정에서 카메라 권한을 확인해주세요.");
    }
}

function takeSnapshot() {
    const captureCanvas = document.getElementById('captureCanvas');
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;
    captureCanvas.getContext('2d').drawImage(video, 0, 0);
    processImage(captureCanvas.toDataURL('image/jpeg'));
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

// 6. UI 기능
function showLoading(show, msg) {
    const el = document.getElementById('customAlert');
    document.getElementById('alertMessage').innerText = msg;
    el.classList.toggle('show', show);
}

function toggleAudio() {
    const btn = document.getElementById('audioBtn');
    if (bgm.paused) { bgm.play(); btn.innerText = "🔊 소리 켬"; }
    else { bgm.pause(); btn.innerText = "🔇 소리 끔"; }
}

function clearAquarium() { fishes = []; }

// 전체 화면 토글 및 UI 숨기기 기능
// 🖥️ 전체화면 토글 함수
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
    fishes.forEach(f => { f.update(); f.draw(); });
    requestAnimationFrame(animate);
}
animate();