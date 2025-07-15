import React, { useEffect, useState } from 'react';

interface Badge {
  name: string;
  image: string;
  issuedAt: string;
  link: string;
}

function Badges() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = 'christian-gonzales-komiya';
    const target = `https://www.credly.com/users/${userId}/badges.json`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`;

    fetch(proxyUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        const parsed = JSON.parse(data);
        const itemList: Badge[] = parsed.data.map((item: any) => ({
          name: item.badge_template.name,
          image: item.image_url,
          issuedAt: item.issued_at_date,
          link: `https://www.credly.com/badges/${item.id}/public_url`
        }));
        setBadges(itemList);
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setError('No se pudieron cargar las insignias.');
      });
  }, []);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="badges">
      {badges.map((b, idx) => (
        <div key={idx} className="badge">
          <a href={b.link} target="_blank" rel="noreferrer">
            <img src={b.image} alt={b.name} />
            <p>{b.name}</p>
            <small>{b.issuedAt}</small>
          </a>
        </div>
      ))}
    </div>
  );
}


export default Badges;
