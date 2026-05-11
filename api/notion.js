module.exports = async function handler(req, res) {
  // CORS 처리
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  
  // URL에서 type 파라미터 읽기 (예: /api/notion?type=statement)
  let type = 'notice';
  if (req.query && req.query.type) {
    type = req.query.type;
  } else if (req.url && req.url.includes('?')) {
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    type = urlParams.get('type') || 'notice';
  }

  // 타입별 API 키 및 DB ID 설정
  let API_KEY = NOTION_API_KEY;
  let NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID; // 기본값 (공지사항)
  if (type === 'statement') {
    API_KEY = process.env.NOTION_API_KEY_STATEMENT || NOTION_API_KEY;
    NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID_STATEMENT || NOTION_DATABASE_ID;
  } else if (type === 'solidarity') {
    API_KEY = process.env.NOTION_API_KEY_SOLIDARITY || NOTION_API_KEY;
    NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID_SOLIDARITY || NOTION_DATABASE_ID;
  }

  if (!API_KEY || !NOTION_DATABASE_ID) {
    return res.status(500).json({ error: 'Missing Notion API Key or Database ID in environment variables.' });
  }

  const url = `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`;

  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filter: {
        property: '상태',
        status: {
          equals: '게시중',
        },
      },
      sorts: [
        {
          property: '게시일',
          direction: 'descending',
        },
      ],
      page_size: 5,
    })
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Notion API Error:', errorData);
      return res.status(response.status).json({ error: 'Failed to fetch data from Notion API', details: errorData });
    }

    const data = await response.json();

    // 결과를 클라이언트가 쓰기 쉬운 포맷으로 가공
    const formattedResults = data.results.map((page) => {
      // 본문 텍스트 합치기 및 줄바꿈 처리
      const richTextArr = page.properties['내용']?.rich_text || [];
      const content = richTextArr.map(t => t.plain_text).join('').replace(/\n/g, '<br>');

      // 파일 속성에서 URL 추출 함수
      const getFileUrl = (propName) => {
        const prop = page.properties[propName];
        if (!prop || prop.type !== 'files' || !prop.files || prop.files.length === 0) return null;
        const file = prop.files[0];
        return file.file ? file.file.url : (file.external ? file.external.url : null);
      };

      return {
        id: page.id,
        title: page.properties['제목']?.title[0]?.plain_text || '제목 없음',
        date: page.properties['게시일']?.date?.start || '날짜 없음',
        url: page.url,
        content: content,
        photo1: getFileUrl('사진 1'),
        photo2: getFileUrl('사진 2'),
        attachment: getFileUrl('첨부파일 URL'),
      };
    });

    res.status(200).json(formattedResults);
  } catch (error) {
    console.error('Fetch Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
