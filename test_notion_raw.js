require('dotenv').config();

async function testFetch() {
  const url = `https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`;
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    }
  };

  try {
    const res = await fetch(url, options);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

testFetch();
