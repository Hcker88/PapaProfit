import fs from 'fs';

async function check() {
  const res = await fetch('https://api.github.com/repos/Hcker88/PapaProfit/commits/93ecc8bc9527a9a01776863e96f0a4da2e2bf113');
  const commit = await res.json();
  console.log(commit.commit.message);
  console.log(commit.commit.author.date);
}
check();
