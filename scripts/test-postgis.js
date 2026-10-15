async function verifyRadiusAndOrdering() {
  const centerLat = 37.4954;
  const centerLon = 127.0333;

  console.log('=== 1. Testing 500m Radius ===');
  const res500 = await fetch(`http://localhost:3000/api/restaurants?lat=${centerLat}&lon=${centerLon}&radius=500&numOfRows=20`);
  const json500 = await res500.json();
  console.log('Total Count returned:', json500.data ? json500.data.length : 0);

  if (json500.itemsWithDistance && json500.itemsWithDistance.length > 0) {
    let allWithin500 = true;
    let isSortedAsc = true;
    let prevDist = -1;

    json500.itemsWithDistance.forEach((item, idx) => {
      const d = item.distance;
      if (d > 500) allWithin500 = false;
      if (prevDist !== -1 && d < prevDist) isSortedAsc = false;
      prevDist = d;
      if (idx < 5) {
        console.log(`  [${idx + 1}] ${item.restaurant.name}: ${d}m (직선거리)`);
      }
    });

    console.log('  -> All items <= 500m?:', allWithin500);
    console.log('  -> Correctly sorted ascending?:', isSortedAsc);
  }

  console.log('\n=== 2. Testing 1km Radius ===');
  const res1000 = await fetch(`http://localhost:3000/api/restaurants?lat=${centerLat}&lon=${centerLon}&radius=1000&numOfRows=20`);
  const json1000 = await res1000.json();
  console.log('Total Count returned:', json1000.data ? json1000.data.length : 0);
  if (json1000.itemsWithDistance && json1000.itemsWithDistance.length > 0) {
    let allWithin1000 = true;
    json1000.itemsWithDistance.forEach(item => {
      if (item.distance > 1000) allWithin1000 = false;
    });
    const maxD = Math.max(...json1000.itemsWithDistance.map(i => i.distance));
    console.log('  -> All items <= 1000m?:', allWithin1000);
    console.log('  -> Max distance in 1km query:', maxD + 'm');
  }

  console.log('\n=== 3. Testing Category Filter & Search ===');
  const resCategory = await fetch(`http://localhost:3000/api/restaurants?lat=${centerLat}&lon=${centerLon}&radius=1000&category=${encodeURIComponent('일식')}`);
  const jsonCategory = await resCategory.json();
  console.log('Category "일식" count:', jsonCategory.data ? jsonCategory.data.length : 0);
  if (jsonCategory.data && jsonCategory.data.length > 0) {
    jsonCategory.data.slice(0, 3).forEach(r => console.log('  -> Match:', r.name, '|', r.category));
  }
}

verifyRadiusAndOrdering();
