import { SIGHT_FILES } from './data/curated-images.js';
import { slugify } from './images.js';

function sampleAct(act) {
  const path = SIGHT_FILES[slugify(act.title)] || '';
  return { ...act, link: act.link ?? '', imageUrl: path };
}

function sampleDay(day) {
  return {
    ...day,
    blocks: {
      morning: day.blocks.morning.map(sampleAct),
      afternoon: day.blocks.afternoon.map(sampleAct),
      evening: day.blocks.evening.map(sampleAct)
    }
  };
}

function sampleTrip(trip) {
  return { ...trip, days: trip.days.map(sampleDay) };
}

const RAW_SAMPLE_TRIPS = [
  {
    title: 'Tokyo Food & Culture',
    destination: 'Tokyo, Japan',
    tagline: 'Neon nights and noodle mornings',
    startDate: '2026-04-10',
    endDate: '2026-04-14',
    days: [
      {
        id: 's1d1', label: 'Day 1', date: '2026-04-10',
        blocks: {
          morning: [{ id: 's1a1', title: 'Tsukiji Outer Market', location: 'Chuo City', notes: 'Fresh sushi breakfast', category: 'food', link: '' }],
          afternoon: [{ id: 's1a2', title: 'Senso-ji Temple', location: 'Asakusa', notes: 'Explore Nakamise shopping street', category: 'culture', link: '' }],
          evening: [{ id: 's1a3', title: 'Shibuya Crossing', location: 'Shibuya', notes: 'Dinner at a local izakaya', category: 'food', link: '' }]
        }
      },
      {
        id: 's1d2', label: 'Day 2', date: '2026-04-11',
        blocks: {
          morning: [{ id: 's1a4', title: 'Meiji Shrine', location: 'Shibuya', notes: 'Peaceful forest walk', category: 'nature', link: '' }],
          afternoon: [{ id: 's1a5', title: 'Harajuku', location: 'Takeshita Street', notes: 'Street fashion and crepes', category: 'culture', link: '' }],
          evening: [{ id: 's1a6', title: 'TeamLab Planets', location: 'Toyosu', notes: 'Book tickets in advance', category: 'culture', link: 'https://teamlab.art' }]
        }
      }
    ]
  },
  {
    title: 'Iceland Ring Road',
    destination: 'Reykjavik, Iceland',
    tagline: 'Fire, ice, and endless horizons',
    startDate: '2026-07-01',
    endDate: '2026-07-08',
    days: [
      {
        id: 's2d1', label: 'Day 1', date: '2026-07-01',
        blocks: {
          morning: [{ id: 's2a1', title: 'Blue Lagoon', location: 'Grindavik', notes: 'Pre-book spa entry', category: 'nature', link: '' }],
          afternoon: [{ id: 's2a2', title: 'Reykjavik Walking Tour', location: 'Downtown', notes: 'Hallgrímskirkja church', category: 'culture', link: '' }],
          evening: [{ id: 's2a3', title: 'Hotel Reykjavik Centrum', location: 'Reykjavik', notes: 'Check in and rest', category: 'stay', link: '' }]
        }
      },
      {
        id: 's2d2', label: 'Day 2', date: '2026-07-02',
        blocks: {
          morning: [{ id: 's2a4', title: 'Golden Circle Drive', location: 'Selfoss', notes: 'Rent 4x4', category: 'transport', link: '' }],
          afternoon: [{ id: 's2a5', title: 'Gullfoss Waterfall', location: 'Golden Circle', notes: 'Rain jacket essential', category: 'nature', link: '' }],
          evening: [{ id: 's2a6', title: 'Geysir Hot Springs', location: 'Haukadalur', notes: 'Strokkur erupts every 5-10 min', category: 'nature', link: '' }]
        }
      }
    ]
  },
  {
    title: 'Lisbon Long Weekend',
    destination: 'Lisbon, Portugal',
    tagline: 'Tiles, tram rides, and ocean breeze',
    startDate: '2026-05-15',
    endDate: '2026-05-18',
    days: [
      {
        id: 's3d1', label: 'Day 1', date: '2026-05-15',
        blocks: {
          morning: [{ id: 's3a1', title: 'Pastéis de Belém', location: 'Belém', notes: 'Original custard tarts', category: 'food', link: '' }],
          afternoon: [{ id: 's3a2', title: 'Jerónimos Monastery', location: 'Belém', notes: 'UNESCO World Heritage site', category: 'culture', link: '' }],
          evening: [{ id: 's3a3', title: 'Time Out Market', location: 'Cais do Sodré', notes: 'Food hall dinner', category: 'food', link: '' }]
        }
      },
      {
        id: 's3d2', label: 'Day 2', date: '2026-05-16',
        blocks: {
          morning: [{ id: 's3a4', title: 'Alfama District', location: 'Alfama', notes: 'Fado music and miradouros', category: 'culture', link: '' }],
          afternoon: [{ id: 's3a5', title: 'Tram 28', location: 'Martim Moniz', notes: 'Classic yellow tram ride', category: 'transport', link: '' }],
          evening: [{ id: 's3a6', title: 'LX Factory', location: 'Alcântara', notes: 'Creative hub and rooftop bars', category: 'culture', link: '' }]
        }
      }
    ]
  }
];

export const SAMPLE_TRIPS = RAW_SAMPLE_TRIPS.map(sampleTrip);

export const DAY_TEMPLATES = {
  culture: {
    label: 'City culture day',
    blocks: {
      morning: [{ title: 'Historic neighborhood walk', location: '', category: 'culture', notes: 'Coffee at a local café' }],
      afternoon: [{ title: 'Museum or gallery', location: '', category: 'culture', notes: 'Book tickets if needed' }],
      evening: [{ title: 'Local dinner spot', location: '', category: 'food', notes: '' }]
    }
  },
  food: {
    label: 'Food crawl',
    blocks: {
      morning: [{ title: 'Market breakfast', location: '', category: 'food', notes: '' }],
      afternoon: [{ title: 'Street food tour', location: '', category: 'food', notes: '' }],
      evening: [{ title: "Chef's table or bistro", location: '', category: 'food', notes: 'Reservation recommended' }]
    }
  },
  nature: {
    label: 'Travel + nature',
    blocks: {
      morning: [{ title: 'Scenic drive or train', location: '', category: 'transport', notes: '' }],
      afternoon: [{ title: 'Hike or viewpoint', location: '', category: 'nature', notes: 'Pack water & layers' }],
      evening: [{ title: 'Lodging check-in', location: '', category: 'stay', notes: '' }]
    }
  }
};
