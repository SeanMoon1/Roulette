// 룰렛 항목 데이터
let items = [];
let spinning = false;
let angle = 0;
let spinTimeout = null;
let spinVelocity = 0;
let stopRequested = false;

// DOM 요소 참조
const canvas = document.getElementById('roulette');
const ctx = canvas.getContext('2d');
const itemInput = document.getElementById('item-input');
const addBtn = document.getElementById('add-btn');
const listBox = document.getElementById('item-list');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');


// 룰렛 그리기
function drawRoulette() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = Math.min(cx, cy) - 10;
  const n = items.length;

  if (n === 0) {
    // 빈 룰렛(회색)
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#ccc';
    ctx.fill();
    ctx.stroke();
    return;
  }

  let startAngle = angle;
  for (let i = 0; i < n; i++) {
    const item = items[i];
    const sliceAngle = (2 * Math.PI) * (item.count / getTotalCount());
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.fillStyle = getColor(i);
    ctx.fill();
    ctx.stroke();

    // 텍스트 색상: 네이비 고정
    const textColor = '#1a2236';

    // 텍스트
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = textColor;
    ctx.font = '16px sans-serif';
    ctx.fillText(item.name, radius - 10, 0);
    ctx.restore();

    startAngle += sliceAngle;
  }
}

// 색상 생성
function getColor(i) {
  // 룰렛 배경색 파스텔톤
  return '#e6f0fa';
}

// 색상 밝기 판별 (YIQ)
function isColorBright(hex) {
  let c = hex.substring(1); // remove #
  if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
  const rgb = [parseInt(c.substr(0,2),16), parseInt(c.substr(2,2),16), parseInt(c.substr(4,2),16)];
  // YIQ 공식
  const yiq = (rgb[0]*299 + rgb[1]*587 + rgb[2]*114) / 1000;
  return yiq > 160;
}

// 전체 항목 수량 합계
function getTotalCount() {
  return items.reduce((sum, item) => sum + item.count, 0) || 1;
}

// 항목 리스트 및 확률 표시
function updateListBox() {
  listBox.innerHTML = '';
  items.forEach((item, idx) => {
    const li = document.createElement('li');
    const prob = ((item.count / getTotalCount()) * 100).toFixed(2);
    // 항목명, 수량, 확률
    const label = document.createElement('span');
    label.textContent = `${item.name} (`;
    // 수량 조절 버튼
    const downBtn = document.createElement('button');
    downBtn.textContent = '▼';
    downBtn.onclick = () => {
      if (item.count > 1) {
        item.count--;
        updateListBox();
        drawRoulette();
      }
    };
    const countSpan = document.createElement('span');
    countSpan.textContent = item.count;
    countSpan.style.margin = '0 4px';
    const upBtn = document.createElement('button');
    upBtn.textContent = '▲';
    upBtn.onclick = () => {
      item.count++;
      updateListBox();
      drawRoulette();
    };
    const probSpan = document.createElement('span');
    probSpan.textContent = `, ${prob}%)`;
    // X 삭제 버튼
    const delBtn = document.createElement('button');
    delBtn.textContent = 'X';
    delBtn.style.marginLeft = '8px';
    delBtn.onclick = () => {
      items.splice(idx, 1);
      updateListBox();
      drawRoulette();
    };
    li.appendChild(label);
    li.appendChild(downBtn);
    li.appendChild(countSpan);
    li.appendChild(upBtn);
    li.appendChild(probSpan);
    li.appendChild(delBtn);
    listBox.appendChild(li);
  });
}

// 항목 추가
addBtn.onclick = () => {
  const name = itemInput.value.trim();
  const count = 1;
  if (!name) return;
  // 중복 항목명 방지
  if (items.some(item => item.name === name)) {
    alert('이미 존재하는 항목입니다.');
    return;
  }
  items.push({ name, count });
  itemInput.value = '';
  updateListBox();
  drawRoulette();
};

// Enter 키로 항목 추가
itemInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    addBtn.onclick();
  }
});

// 룰렛 돌리기
startBtn.onclick = () => {
  if (spinning || items.length === 0) return;
  spinning = true;
  stopRequested = false;
  spinVelocity = Math.random() * 0.2 + 0.4; // 초기 속도 더 빠르게
  spin();
};

// 룰렛 멈추기
stopBtn.onclick = () => {
  stopRequested = true;
};

function showWinnerPopup(name) {
  const popup = document.getElementById('win-popup');
  popup.textContent = `당첨!  ${name}`;
  popup.style.display = 'block';
  setTimeout(() => {
    popup.style.display = 'none';
  }, 2000);
}

function spin() {
  if (!spinning) return;
  angle += spinVelocity;
  angle %= 2 * Math.PI;
  drawRoulette();

  if (stopRequested) {
    spinVelocity *= 0.97; // 감속
    if (spinVelocity < 0.01) {
      spinning = false;
      spinVelocity = 0;
      stopRequested = false;
      // 당첨 항목 계산 및 팝업
      if (items.length > 0) {
        const winner = getWinnerByAngle(angle);
        showWinnerPopup(winner.name);
      }
      return;
    }
  }
  if (spinning) {
    spinTimeout = setTimeout(spin, 16);
  }
}

// 현재 angle에서 화살표(위쪽, 270도)가 가리키는 항목 반환
function getWinnerByAngle(currentAngle) {
  // 화살표는 캔버스 기준 270도(위쪽) → 실제로는 -Math.PI/2
  let pointer = (3 * Math.PI / 2 - currentAngle) % (2 * Math.PI);
  if (pointer < 0) pointer += 2 * Math.PI;
  let start = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const slice = 2 * Math.PI * (item.count / getTotalCount());
    if (pointer >= start && pointer < start + slice) {
      return item;
    }
    start += slice;
  }
  // fallback
  return items[0];
}

// 초기화
drawRoulette();
updateListBox();
