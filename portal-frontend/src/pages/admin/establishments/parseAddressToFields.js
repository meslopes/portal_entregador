export function parseAddressToFields(addr) {
  let cleanAddr = (addr || '').replace(/,\s*\d{5}-?\d{3}\s*$/, '').trim();
  cleanAddr = cleanAddr.replace(/,\s*,/g, ',').trim().replace(/,+$/, '');

  let street = '', number = '', neighborhood = '';
  let city = 'Capão da Canoa', state = 'RS', zip = '';

  const numberMatch = cleanAddr.match(/,\s*(\d+)/);
  if (numberMatch) {
    number = numberMatch[1];
    cleanAddr = cleanAddr.replace(/,\s*\d+/, ',');
  }

  const parts = cleanAddr.split(',').map(s => s.trim()).filter(p => p);

  if (parts.length >= 1) street = parts[0].replace(/\s*-\s*\d+\s*$/, '').trim();

  if (parts.length >= 2) {
    const hoodPart = parts[1];
    if (hoodPart.includes(' - ')) {
      const hoodParts = hoodPart.split(' - ');
      neighborhood = hoodParts[0].trim();
      if (hoodParts[1]) {
        const csParts = hoodParts[1].split('/');
        city = (csParts[0] || city).trim();
        state = (csParts[1] || state).trim();
      }
    } else if (hoodPart.includes('/')) {
      const csParts = hoodPart.split('/');
      city = (csParts[0] || city).trim();
      state = (csParts[1] || state).trim();
    } else {
      neighborhood = hoodPart.trim();
    }
  }

  if (parts.length >= 3) {
    const lastPart = parts[parts.length - 1];
    if (lastPart.includes('/')) {
      const csParts = lastPart.split('/');
      city = (csParts[0] || city).trim();
      state = (csParts[1] || state).trim();
    } else if (lastPart.length <= 2) {
      state = lastPart.trim();
    } else {
      city = lastPart.trim();
    }
  }

  return { address_street: street, address_number: number, address_neighborhood: neighborhood, address_city: city, address_state: state, address_zip: zip };
}
