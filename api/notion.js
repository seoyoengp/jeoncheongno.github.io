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
  // URL 인스턴스를 통해 query 파라미터 파싱 (Express, Vercel 환경에 따라 req.query를 우선 사용)
  let type = 'notice';
  if (req.query && req.query.type) {
    type = req.query.type;
  } else if (req.url && req.url.includes('?')) {
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    type = urlParams.get('type') || 'notice';
  }

  let NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID; // 기본값 (공지사항)
  if (type === 'statement') {
    NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID_STATEMENT || NOTION_DATABASE_ID;
  } else if (type === 'press') {
    NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID_PRESS || NOTION_DATABASE_ID;
  }

  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    return res.status(500).json({ error: 'Missing Notion API Key or Database ID in environment variables.' });
  }

  const url = `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`;

  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
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

      return {
        id: page.id,
        title: page.properties['제목']?.title[0]?.plain_text || '제목 없음',
        date: page.properties['게시일']?.date?.start || '날짜 없음',
        url: page.url, // 외부 Notion 링크 (옵션용)
        content: content,
        photo1: page.properties['사진 1']?.url || null,
        photo2: page.properties['사진 2']?.url || null,
        attachment: page.properties['첨부파일 URL']?.url || null,
      };
    });

    res.status(200).json(formattedResults);
  } catch (error) {
    console.error('Fetch Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
