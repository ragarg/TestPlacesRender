/**
 * 
 * @param {number} count - Number of generated places data
 * @returns {Array<Object>} - Array with places data of a given size count
 */
export default function generatePlaces(count) {
  const prefixes = ['shop', 'food', 'cafe', 'store', 'boutique', 'restaurant'];
  const shopNames = [
    'Apple Store', 'Starbucks', 'Zara', 'H&M', 'McDonald\'s', 'KFC',
    'Burger King', 'Adidas', 'Nike', 'Puma', 'Sephora', 'IKEA',
    'Decathlon', 'MediaMarkt', 'Douglas', 'Mango', 'Bershka', 'Pull&Bear',
    'Stradivarius', 'Oysho', 'Zara Home', 'Primark', 'C&A', 'New Yorker',
    'Tesco', 'Auchan', 'Leroy Merlin', 'Castorama', 'Rossmann', 'DM'
  ];
  const foodNames = [
    'Фуд-корт', 'Пиццерия', 'Суши-шоп', 'Бургерная', 'Кофейня',
    'Пельменная', 'Wok-кафе', 'Столовая', 'Кондитерская', 'Мороженое'
  ];

  const places = [];

  for (let i = 1; i <= count; i++) {

    let prefix, name;
    const typeRand = Math.random();
    
    if (typeRand < 0.7) {

      prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      name = shopNames[Math.floor(Math.random() * shopNames.length)];

      if (Math.random() > 0.8) name += ` ${Math.floor(Math.random() * 10) + 1}`;
    } else {

      prefix = 'food';
      name = foodNames[Math.floor(Math.random() * foodNames.length)];
      if (Math.random() > 0.7) name += ` №${Math.floor(Math.random() * 20) + 1}`;
    }

    const idNum = String(i).padStart(3, '0');
    const id = `${prefix}_${idNum}`;

    const width = Math.floor(Math.random() * 9) + 2;
    const depth = Math.floor(Math.random() * 7) + 2;

    const color = Math.floor(Math.random() * 0xFFFFFF);

    places.push({ id, name, width, depth, color });
  }

  return places;
}