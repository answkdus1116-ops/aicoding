const canvas = document.getElementById('aquariumCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const bgm = document.getElementById('bgm');
const GOOGLE_VISION_API_KEY = 'YOUR_API_KEY'; // 여기에 본인의 키를 입력하세요

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// 🫧 배경 물방울 자동 생성
function createBubbles() {
    const container = document.getElementById('bubbleContainer');
    for (let i = 0; i < 15; i++) {
        const b = document.createElement('div');
        b.className = 'bubble';
        const size = Math.random() * 30 + 10 + 'px';
        b.style.width = size;
        b.style.height = size;
        b.style.left = Math.random() * 100 + 'vw';
        b.style.animationDuration = Math.random() * 5 + 5 + 's';
        b.style.animationDelay = Math.random() * 5 + 's';
        container.appendChild(b);
    }
}
createBubbles();

// 🚪 수족관 시작 (오디오 문제 해결)
function startAquarium() {
    document.getElementById('entryOverlay').style.display = 'none';
    bgm.play();
    document.getElementById('audioBtn').innerText = "🔊 소리 켬";
}

let fishes = [];

class Fish {
    constructor(img) {
        this.img = img;
        this.size = 120 + Math.random() * 80;
        this.x = Math.random() * (canvas.width - this.size);
        this.y = Math.random() * (canvas.height - this.size);
        
        // 대각선 이동을 위한 속도 (X, Y 모두 부여)
        this.speedX = (Math.random() - 0.5) * 4;
        this.speedY = (Math.random() - 0.5) * 2;
        this.flip = this.speedX > 0;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // 충돌 시 튕기기 및 대각선 방향 유지
        if (this.x <= 0 || this.x >= canvas.width - this.size) {
            this.speedX *= -1;
            this.flip = !this.flip;
        }
        if (this.y <= 0 || this.y >= canvas.height - 120) { // 모래사장 높이 고려
            this.speedY *= -1;
        }
    }

    draw() {
        ctx.save();
        // 이동 방향에 따라 살짝 기울어지게 (더 자연스러운 헤엄)
        const angle = Math.atan2(this.speedY, Math.abs(this.speedX)) * 0.4;
        
        if (this.flip) {
            ctx.translate(this.x + this.size, this.y);
            ctx.scale(-1, 1);
            ctx.rotate(-angle);
            ctx.drawImage(this.img, 0, 0, this.size, this.size);
        } else {
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            ctx.drawImage(this.img, 0, 0, this.size, this.size);
        }
        ctx.restore();
    }
}

// 📸 실시간 업로드 및 처리
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    showLoading(true);
    // ... 기존 Vision API 호출 및 extractFishAndAdd 로직 ...
    // (이전 답변의 handleFileUpload, extractFishAndAdd 코드를 그대로 붙여넣으세요)
}

function showLoading(show) {
    const alertBox = document.getElementById('customAlert');
    if (show) alertBox.classList.add('show');
    else alertBox.classList.remove('show');
}

function toggleAudio() {
    const btn = document.getElementById('audioBtn');
    if (bgm.paused) {
        bgm.play();
        btn.innerText = "🔊 소리 켬";
    } else {
        bgm.pause();
        btn.innerText = "🔇 소리 끔";
    }
}

function clearAquarium() { fishes = []; }

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fishes.forEach(fish => { fish.update(); fish.draw(); });
    requestAnimationFrame(animate);
}

animate();