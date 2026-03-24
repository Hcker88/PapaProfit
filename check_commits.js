import fs from 'fs';

async function check() {
  const res = await fetch('https://api.github.com/repos/Hcker88/PapaProfit/commits', {
    headers: {
      'Cache-Control': 'no-cache'
    }
  });
  const commits = await res.json();
  console.log(commits[0].commit.message);
  console.log(commits[0].commit.author.date);
}
check();
