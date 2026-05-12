document.addEventListener('DOMContentLoaded', () => {
  // 탭 메뉴 기능
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // 모든 탭 버튼과 콘텐츠의 active 클래스 제거
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      // 클릭된 버튼과 해당 콘텐츠에 active 클래스 추가
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // 모바일 메뉴 토글 기능
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mainNav = document.querySelector('.main-nav');

  mobileMenuBtn.addEventListener('click', () => {
    mainNav.classList.toggle('active');
  });

  // Notion API 연동 (데이터 불러오기)
  async function fetchNotices() {
    try {
      // 페이지별 타입 결정
      const path = window.location.pathname;
      let typesToFetch = [];
      const urlParams = new URLSearchParams(window.location.search);
      const detailType = urlParams.get('type') || 'notice';
      
      if (path.includes('notice_detail.html')) {
        typesToFetch = [detailType];
      } else if (path.includes('statement.html')) {
        typesToFetch = ['statement'];
      } else if (path.includes('solidarity.html')) {
        typesToFetch = ['solidarity'];
      } else if (path.includes('notice.html')) {
        typesToFetch = ['notice'];
      } else {
        // 메인 페이지(index.html 등)의 경우 3개 탭/섹션 가져오기
        typesToFetch = ['notice', 'statement', 'solidarity'];
      }

      // 병렬로 API 호출 (Vercel 서버리스 함수 절대 URL 사용)
      const API_BASE = 'https://jeoncheongno-github-io.vercel.app';
      const fetchPromises = typesToFetch.map(type => 
        fetch(`${API_BASE}/api/notion.js?type=${type}`).then(res => {
          if (!res.ok) throw new Error('네트워크 응답이 올바르지 않습니다.');
          return res.json().then(data => ({ type, data }));
        })
      );

      const results = await Promise.all(fetchPromises);
      
      results.forEach(result => {
        if (path.includes('notice_detail.html')) {
          renderNoticeDetail(result.data);
        } else {
          renderNotices(result.data, result.type);
        }
      });
    } catch (error) {
      console.error('데이터를 불러오는데 실패했습니다:', error);
      const detailContainer = document.getElementById('notice-detail-container');
      if (detailContainer) {
        detailContainer.innerHTML = '<div style="text-align: center; padding: 50px;"><p>데이터를 불러오는 데 실패했습니다.</p></div>';
      }
    }
  }

  function renderNotices(notices, type) {
    if (type === 'solidarity') {
      const photoGrid = document.querySelector('.photo-grid');
      const subpageContent = document.querySelector('.content-body .dummy-box');
      
      let html = '';
      if (notices && notices.length > 0) {
        html = notices.map(notice => {
          const bgStyle = notice.photo1 ? `background-image: url('${notice.photo1}'); background-size: cover; background-position: center;` : 'background-color: #cbd5e1;';
          return `
            <a href="notice_detail.html?id=${notice.id}&type=${type}" class="photo-card">
              <div class="img-placeholder" style="${bgStyle}"></div>
              <div class="card-desc">${notice.title}</div>
            </a>
          `;
        }).join('');
      } else {
        html = `<p style="grid-column: 1/-1; text-align:center; padding: 20px;">등록된 활동 소식이 없습니다.</p>`;
      }

      if (photoGrid && !window.location.pathname.includes('solidarity.html')) {
        photoGrid.innerHTML = html;
      }
      
      const isSubpage = window.location.pathname.includes('solidarity.html');
      if (subpageContent && isSubpage) {
        subpageContent.parentElement.innerHTML = `<div class="photo-grid">${html}</div>`;
      }
      return;
    }

    // 기존 텍스트 리스트 렌더링 (공지사항, 성명 등)
    let tabId = '#tab1';
    if (type === 'statement') tabId = '#tab2';
    if (type === 'press') tabId = '#tab3';
    const tabContent = document.querySelector(`${tabId} .article-list`);

    // 서브페이지 컨테이너 설정
    const subpageContent = document.querySelector('.content-body .dummy-box');

    let html = '';
    if (notices && notices.length > 0) {
      html = notices.map(notice => `
        <li>
          <a href="notice_detail.html?id=${notice.id}&type=${type}">
            <span class="title">${notice.title}</span>
            <span class="date">${notice.date}</span>
          </a>
        </li>
      `).join('');
    } else {
      html = `<li><span class="title">등록된 게시물이 없습니다.</span></li>`;
    }

    // 메인 화면 탭에 렌더링
    if (tabContent) {
      tabContent.innerHTML = html;
    }

    // 서브페이지(목록)에 렌더링
    const isSubpage = window.location.pathname.includes(type === 'notice' ? 'notice.html' : `${type}.html`);
    if (subpageContent && isSubpage && !window.location.pathname.includes('notice_detail.html')) {
      subpageContent.parentElement.innerHTML = `<ul class="article-list" style="margin-top:20px;">${html}</ul>`;
    }
  }

  function renderNoticeDetail(notices) {
    const urlParams = new URLSearchParams(window.location.search);
    const noticeId = urlParams.get('id');
    const detailType = urlParams.get('type') || 'notice';
    const detailContainer = document.getElementById('notice-detail-container');

    if (!detailContainer) return;

    if (!notices || notices.length === 0) {
      detailContainer.innerHTML = '<div style="text-align: center; padding: 50px;"><p>등록된 게시글이 없습니다.</p></div>';
      return;
    }

    // ID로 게시글 찾기
    const notice = notices.find(n => n.id === noticeId);

    let backUrl = 'notice.html';
    if (detailType === 'statement') backUrl = 'statement.html';
    if (detailType === 'press') backUrl = 'press.html';

    if (!notice) {
      detailContainer.innerHTML = `<div style="text-align: center; padding: 50px;"><p>해당 게시글을 찾을 수 없습니다.</p><div class="back-btn-wrap"><a href="${backUrl}" class="btn" style="display:inline-block; padding:10px 20px; background:var(--primary-color); color:#fff; border-radius:4px;">목록으로</a></div></div>`;
      return;
    }

    // 상세 내용 HTML 구성
    let imagesHtml = '';
    if (notice.photo1) imagesHtml += `<img src="${notice.photo1}" alt="첨부 이미지 1">`;
    if (notice.photo2) imagesHtml += `<img src="${notice.photo2}" alt="첨부 이미지 2">`;

    let attachmentHtml = '';
    if (notice.attachment) {
      attachmentHtml = `
        <div class="attachment-box">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
          <a href="${notice.attachment}" target="_blank" rel="noopener noreferrer">첨부파일 다운로드</a>
        </div>
      `;
    }

    const currentUserStr = localStorage.getItem('currentUser');
    const isLoggedIn = !!currentUserStr;
    const currentUser = isLoggedIn ? JSON.parse(currentUserStr) : null;

    let commentPlaceholder = isLoggedIn ? '댓글을 남겨보세요.' : '로그인 후 댓글을 남길 수 있습니다.';
    let commentDisabled = isLoggedIn ? '' : 'disabled';
    
    // 로컬 스토리지에서 댓글 불러오기
    const allComments = JSON.parse(localStorage.getItem('comments') || '{}');
    const noticeComments = allComments[noticeId] || [];
    
    let commentListHtml = noticeComments.map(c => `
      <div class="comment-item">
        <div class="comment-meta">
          <span class="comment-author">${c.author}</span>
          <span class="comment-date">${c.date}</span>
        </div>
        <div class="comment-text">${c.text}</div>
      </div>
    `).join('');

    if (noticeComments.length === 0) {
      commentListHtml = '<div style="color:var(--text-gray); font-size:14px;">아직 작성된 댓글이 없습니다.</div>';
    }

    const html = `
      <div class="notice-title-box">
        <h3>${notice.title}</h3>
        <div class="notice-meta">
          <span>등록일: ${notice.date}</span>
          <span>전국청소년노동조합</span>
        </div>
      </div>
      <div class="notice-body">
        <p>${notice.content}</p>
        ${imagesHtml ? `<div class="notice-images">${imagesHtml}</div>` : ''}
      </div>
      ${attachmentHtml}
      
      <div class="comment-section">
        <h4>댓글 <span id="comment-count" style="color:var(--primary-color)">${noticeComments.length}</span></h4>
        <form class="comment-form" id="commentForm">
          <textarea id="commentText" placeholder="${commentPlaceholder}" ${commentDisabled} required></textarea>
          ${isLoggedIn ? '<button type="submit" class="btn-submit">등록</button>' : '<a href="login.html" class="btn-submit" style="text-align:center; text-decoration:none; width:max-content; align-self:flex-end;">로그인하러 가기</a>'}
        </form>
        <div class="comment-list" id="commentList">
          ${commentListHtml}
        </div>
      </div>

      <div class="back-btn-wrap">
        <a href="${backUrl}" class="btn" style="display:inline-block; padding:10px 30px; background:var(--border-color); color:var(--text-dark); border-radius:4px; font-weight:700;">목록보기</a>
      </div>
    `;

    detailContainer.innerHTML = html;

    // 댓글 작성 이벤트 리스너
    if (isLoggedIn) {
      const commentForm = document.getElementById('commentForm');
      commentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = document.getElementById('commentText').value.trim();
        if (!text) return;

        const dateObj = new Date();
        const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${String(dateObj.getDate()).padStart(2,'0')} ${String(dateObj.getHours()).padStart(2,'0')}:${String(dateObj.getMinutes()).padStart(2,'0')}`;
        
        const newComment = {
          author: currentUser.name,
          text: text.replace(/\n/g, '<br>'),
          date: dateStr
        };

        allComments[noticeId] = allComments[noticeId] || [];
        allComments[noticeId].push(newComment);
        localStorage.setItem('comments', JSON.stringify(allComments));
        
        // 화면에 즉시 렌더링 (리로드 없이)
        const commentList = document.getElementById('commentList');
        const newHtml = `
          <div class="comment-item">
            <div class="comment-meta">
              <span class="comment-author">${newComment.author}</span>
              <span class="comment-date">${newComment.date}</span>
            </div>
            <div class="comment-text">${newComment.text}</div>
          </div>
        `;
        
        if (allComments[noticeId].length === 1) {
          commentList.innerHTML = newHtml; // 기존 '아직 작성된 댓글이 없습니다' 덮어쓰기
        } else {
          commentList.insertAdjacentHTML('beforeend', newHtml);
        }
        
        document.getElementById('commentText').value = '';
        document.getElementById('comment-count').innerText = allComments[noticeId].length;
      });
    }
  }

  // 데이터 로드 실행
  fetchNotices();

  // ==========================================
  // 회원가입 및 로그인 로직 (로컬 스토리지 활용)
  // ==========================================
  
  // UI 업데이트 (헤더 상단 util-links 변경)
  function updateAuthUI() {
    const utilLinks = document.querySelector('.util-links');
    if (!utilLinks) return;
    
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
      const currentUser = JSON.parse(currentUserStr);
      utilLinks.innerHTML = `
        <li><span style="font-size:12px; font-weight:700;">${currentUser.name} 님 환영합니다</span></li>
        <li><a href="#" id="logoutBtn">로그아웃</a></li>
        <li><a href="sitemap.html">사이트맵</a></li>
      `;
      
      // 로그아웃 이벤트 등록
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          localStorage.removeItem('currentUser');
          alert('로그아웃 되었습니다.');
          window.location.reload();
        });
      }
    } else {
      utilLinks.innerHTML = `
        <li><a href="login.html">로그인</a></li>
        <li><a href="signup.html">회원가입</a></li>
        <li><a href="sitemap.html">사이트맵</a></li>
      `;
    }
  }

  // 초기 렌더링 시 인증 UI 업데이트
  updateAuthUI();

  // 회원가입 처리
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = document.getElementById('signupName').value.trim();
      const id = document.getElementById('signupId').value.trim();
      const password = document.getElementById('signupPw').value;
      const passwordConfirm = document.getElementById('signupPwConfirm').value;
      
      if (password !== passwordConfirm) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
      }
      
      // 로컬 스토리지에서 기존 유저 목록 가져오기
      let users = JSON.parse(localStorage.getItem('users') || '[]');
      
      // 아이디 중복 검사
      const isDuplicate = users.some(user => user.id === id);
      if (isDuplicate) {
        alert('이미 존재하는 아이디입니다.');
        return;
      }
      
      // 새 유저 저장
      const newUser = { name, id, password };
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      
      // 가입 즉시 자동 로그인 처리
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      
      alert('회원가입이 완료되었습니다!');
      window.location.href = 'index.html'; // 메인 페이지로 이동
    });
  }

  // 로그인 처리
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const id = document.getElementById('loginId').value.trim();
      const password = document.getElementById('loginPw').value;
      
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find(u => u.id === id && u.password === password);
      
      if (user) {
        // 로그인 성공
        localStorage.setItem('currentUser', JSON.stringify(user));
        alert('로그인 성공!');
        window.location.href = 'index.html';
      } else {
        alert('아이디 또는 비밀번호가 일치하지 않습니다.');
      }
    });
  }

});
