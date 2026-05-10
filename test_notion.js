require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

async function test() {
  try {
    const response = await notion.dataSources.query({
      data_source_id: databaseId,
    });
    console.log(JSON.stringify(response.results[0].properties, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
