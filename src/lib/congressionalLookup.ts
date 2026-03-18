/**
 * Congressional District Lookup for South Carolina
 *
 * Uses county FIPS code to determine congressional district.
 * SC has 7 congressional districts (118th Congress, 2023-2025).
 *
 * Note: Some counties are split between districts. For split counties,
 * we use the district that contains the majority of the population.
 * For precise lookup in split counties, a full GeoJSON boundary check would be needed.
 */

// South Carolina county FIPS codes to Congressional District mapping
// Based on 2022 redistricting (118th Congress boundaries)
const COUNTY_TO_CD: Record<string, number> = {
  // CD-1: Coastal - Charleston (most), Berkeley (part), Beaufort, Jasper, Colleton (part), Dorchester (part)
  '019': 1, // Charleston County (majority in CD-1)
  '013': 1, // Beaufort County
  '053': 1, // Jasper County

  // CD-2: Central Midlands - Lexington, Aiken, Barnwell, Orangeburg (part), Richland (part)
  '063': 2, // Lexington County
  '003': 2, // Aiken County
  '011': 2, // Barnwell County
  '009': 2, // Bamberg County
  '005': 2, // Allendale County
  '049': 2, // Hampton County

  // CD-3: Upstate West - Anderson, Oconee, Pickens, Abbeville, Greenwood, Laurens, McCormick, Edgefield
  '007': 3, // Anderson County
  '073': 3, // Oconee County
  '077': 3, // Pickens County
  '001': 3, // Abbeville County
  '047': 3, // Greenwood County
  '059': 3, // Laurens County
  '065': 3, // McCormick County
  '037': 3, // Edgefield County
  '081': 3, // Saluda County
  '071': 3, // Newberry County

  // CD-4: Upstate East - Greenville, Spartanburg (part)
  '045': 4, // Greenville County

  // CD-5: North Central - York, Chester, Lancaster, Fairfield, Kershaw, Union, Cherokee, Spartanburg (part)
  '091': 5, // York County
  '023': 5, // Chester County
  '057': 5, // Lancaster County
  '039': 5, // Fairfield County
  '055': 5, // Kershaw County
  '087': 5, // Union County
  '021': 5, // Cherokee County
  '083': 5, // Spartanburg County (majority in CD-5)

  // CD-6: Pee Dee & Midlands - Richland (most), Sumter, Clarendon, Williamsburg, Florence (part), Marion, Dillon, Marlboro, Lee, Darlington, Orangeburg (part)
  '079': 6, // Richland County (majority in CD-6)
  '085': 6, // Sumter County
  '027': 6, // Clarendon County
  '089': 6, // Williamsburg County
  '069': 6, // Marion County
  '033': 6, // Dillon County
  '067': 6, // Marlboro County
  '061': 6, // Lee County
  '031': 6, // Darlington County
  '075': 6, // Orangeburg County
  '025': 6, // Chesterfield County

  // CD-7: Grand Strand & Pee Dee - Horry, Georgetown, Florence (most), Berkeley (part), Dorchester (part), Colleton (part)
  '051': 7, // Horry County
  '043': 7, // Georgetown County
  '041': 7, // Florence County
  '015': 7, // Berkeley County (split, majority CD-7)
  '035': 7, // Dorchester County (split, but using CD-7)
  '029': 7, // Colleton County (split)
};

// County names for display
export const SC_COUNTIES: Record<string, string> = {
  '001': 'Abbeville',
  '003': 'Aiken',
  '005': 'Allendale',
  '007': 'Anderson',
  '009': 'Bamberg',
  '011': 'Barnwell',
  '013': 'Beaufort',
  '015': 'Berkeley',
  '017': 'Calhoun',
  '019': 'Charleston',
  '021': 'Cherokee',
  '023': 'Chester',
  '025': 'Chesterfield',
  '027': 'Clarendon',
  '029': 'Colleton',
  '031': 'Darlington',
  '033': 'Dillon',
  '035': 'Dorchester',
  '037': 'Edgefield',
  '039': 'Fairfield',
  '041': 'Florence',
  '043': 'Georgetown',
  '045': 'Greenville',
  '047': 'Greenwood',
  '049': 'Hampton',
  '051': 'Horry',
  '053': 'Jasper',
  '055': 'Kershaw',
  '057': 'Lancaster',
  '059': 'Laurens',
  '061': 'Lee',
  '063': 'Lexington',
  '065': 'McCormick',
  '067': 'Marlboro',
  '069': 'Marion',
  '071': 'Newberry',
  '073': 'Oconee',
  '075': 'Orangeburg',
  '077': 'Pickens',
  '079': 'Richland',
  '081': 'Saluda',
  '083': 'Spartanburg',
  '085': 'Sumter',
  '087': 'Union',
  '089': 'Williamsburg',
  '091': 'York',
};

// Add Calhoun to CD-6 (wasn't in the initial list)
COUNTY_TO_CD['017'] = 6; // Calhoun County

/**
 * Look up congressional district from county FIPS code
 */
export function getCongressionalDistrictByCounty(countyFips: string): number | null {
  // Ensure 3-digit format
  const fips = countyFips.padStart(3, '0');
  return COUNTY_TO_CD[fips] || null;
}

/**
 * Get county name from FIPS code
 */
export function getCountyName(countyFips: string): string | null {
  const fips = countyFips.padStart(3, '0');
  return SC_COUNTIES[fips] || null;
}

/**
 * Reverse geocode to get county FIPS using Nominatim
 */
export async function getCountyFromCoordinates(lat: number, lon: number): Promise<{
  countyFips: string | null;
  countyName: string | null;
  congressionalDistrict: number | null;
}> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lon.toString());
    url.searchParams.set('format', 'json');
    url.searchParams.set('zoom', '10'); // County level
    url.searchParams.set('addressdetails', '1');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'SC-Election-Map-2026/1.0',
      },
    });

    if (!response.ok) {
      return { countyFips: null, countyName: null, congressionalDistrict: null };
    }

    const data = await response.json();

    // Extract county from address details
    const county = data.address?.county || data.address?.city;

    if (!county) {
      return { countyFips: null, countyName: null, congressionalDistrict: null };
    }

    // Find county FIPS by name
    const countyNameClean = county.replace(/ County$/i, '').toLowerCase();
    const fipsEntry = Object.entries(SC_COUNTIES).find(
      ([, name]) => name.toLowerCase() === countyNameClean
    );

    if (!fipsEntry) {
      return { countyFips: null, countyName: county, congressionalDistrict: null };
    }

    const [countyFips] = fipsEntry;
    const congressionalDistrict = getCongressionalDistrictByCounty(countyFips);

    return {
      countyFips,
      countyName: SC_COUNTIES[countyFips],
      congressionalDistrict,
    };
  } catch {
    return { countyFips: null, countyName: null, congressionalDistrict: null };
  }
}

/**
 * Congressional district info for display
 */
export const CD_INFO: Record<number, { name: string; description: string }> = {
  1: {
    name: 'SC Congressional District 1',
    description: 'Lowcountry - Charleston, Beaufort, Jasper',
  },
  2: {
    name: 'SC Congressional District 2',
    description: 'Central - Lexington, Aiken, Barnwell',
  },
  3: {
    name: 'SC Congressional District 3',
    description: 'Upstate West - Anderson, Pickens, Oconee',
  },
  4: {
    name: 'SC Congressional District 4',
    description: 'Upstate - Greenville',
  },
  5: {
    name: 'SC Congressional District 5',
    description: 'North Central - York, Spartanburg, Chester',
  },
  6: {
    name: 'SC Congressional District 6',
    description: 'Midlands & Pee Dee - Richland, Sumter, Orangeburg',
  },
  7: {
    name: 'SC Congressional District 7',
    description: 'Grand Strand - Horry, Florence, Georgetown',
  },
};
