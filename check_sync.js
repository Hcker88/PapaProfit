import fs from 'fs';

async function checkSync() {
  try {
    const res = await fetch('https://api.github.com/repos/Hcker88/PapaProfit/commits?per_page=1', {
      headers: {
        'Cache-Control': 'no-cache',
        'User-Agent': 'AI-Studio-Agent'
      }
    });
    const commits = await res.json();
    if (commits && commits.length > 0) {
      const latest = commits[0];
      console.log('Latest Commit SHA:', latest.sha);
      console.log('Message:', latest.commit.message);
      console.log('Date:', latest.commit.author.date);
    } else {
      console.log('No commits found or error fetching.');
    }
  } catch (e) {
    console.error('Error:', e);
  }
}
checkSync();
