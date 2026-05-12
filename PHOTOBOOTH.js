const video = document.getElementById('cameraView');
const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
let isBold = false;

// 1. 카메라 시작 함수 (오류 진단 포함)
async function startCamera() {
    // 1. 구형 브라우저 지원을 위한 체크
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("이 브라우저에서는 카메라 기능을 지원하지 않습니다. 크롬이나 사파리를 이용해주세요.");
        return;
    }

    // 2. 가장 기본적이고 호환성 높은 설정으로 시도
    const constraints = {
        video: true // 복잡한 옵션을 빼고 '비디오 권한'에만 집중
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        
        // 비디오가 실제로 재생될 때까지 기다림 (iOS 대응)
        video.onloadedmetadata = () => {
            video.play();
        };
        
        console.log("카메라 연결 성공!");
    } catch (e) {
        console.error("에러 상세:", e);
        // TypeError는 보통 설정값(Constraints)이 기기와 맞지 않을 때 발생합니다.
        alert("카메라 설정 오류가 발생했습니다. (원인: " + e.name + ")");
    }
}

// 2. 사진 촬영
function takePhoto() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    video.style.display = 'none';
    canvas.classList.add('show');
    document.getElementById('captureBtn').classList.add('hidden');
    document.getElementById('editActions').classList.remove('hidden');
}

// 3. 사진 불러오기
document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (f) => {
        const img = new Image();
        img.onload = () => {
            canvas.width = 1280; canvas.height = 960;
            ctx.drawImage(img, 0, 0, 1280, 960);
            video.style.display = 'none';
            canvas.classList.add('show');
            document.getElementById('captureBtn').classList.add('hidden');
            document.getElementById('editActions').classList.remove('hidden');
        };
        img.src = f.target.result;
    };
    reader.readAsDataURL(file);
});

// 4. 꾸미기 및 저장
function setTheme(theme) { document.body.className = 'theme-' + theme; }
function toggleBold() { 
    isBold = !isBold; 
    document.getElementById('boldBtn').classList.toggle('active'); 
}

function addText() {
    const text = document.getElementById('textInput').value;
    if(!text) return;
    const size = document.getElementById('fontSize').value;
    const font = document.getElementById('fontFamily').value;
    
    ctx.font = `${isBold ? 'bold' : ''} ${size}px ${font}`;
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;
    ctx.textAlign = "center";
    
    // 중앙 배치
    ctx.strokeText(text, canvas.width/2, canvas.height/2);
    ctx.fillText(text, canvas.width/2, canvas.height/2);
}

function addSticker(emoji) {
    ctx.font = "120px Arial";
    ctx.textAlign = "center";
    ctx.fillText(emoji, Math.random()*canvas.width, Math.random()*canvas.height);
}

function downloadImage() {
    // 테마 프레임 씌워서 저장
    const overlay = document.getElementById('themeOverlay');
    const color = getComputedStyle(overlay).borderColor;
    if(color !== 'rgba(0, 0, 0, 0)') {
        ctx.lineWidth = 60; ctx.strokeStyle = color;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }
    const link = document.createElement('a');
    link.download = `photo_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
}

// 초기 실행
startCamera();