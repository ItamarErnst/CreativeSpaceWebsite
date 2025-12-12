// Simple in-repo events "database".
// Notes:
// - Use ISO date format 'YYYY-MM-DD'.
// - The `image` field can be:
//    • a bare name like 'cover' → resolves to 'images/nextEvent/cover.png'
//    • an explicit path (e.g., 'images/nextEvent/custom.png') → used as-is
//    • empty/omitted → falls back to the default 'images/nextEvent/cover.png'
// - NEW: You can also provide `images: [ ... ]` (array). If present, the Next Event
//   section will cycle through them and supports click or swipe to change.
//   Each item can be a bare name (resolved under images/nextEvent/) or a full path.
// - Past events are kept here but are filtered out from display by the rendering logic.

window.EVENTS = [
  {
    name: 'Autumn Open Studio',
    date: '2025-10-05', // past (example)
    location: 'Zurich',
    description: 'Open doors for all — come sketch, paint and chat.',
    image: 'cover'
  },
  {
    name: 'One Piece theory - session 1',
    date: '2025-12-20',
    location: 'Egghead Island, pirate platz 11',
    description: 'We will talk about the history of One Piece and how it shapes our world. Come join us for a fun and interactive session.',
    // Multi-image example for the Next Event section
    images: [
      'images/nextEvent/cover.png',
      'images/art1.png',
      'images/art2.png'
    ]
  },
  {
    name: 'Raphis world of bugs',
    date: '2026-01-24',
    location: 'Zurich',
    description: 'A talk about the history of bugs and how they shape our world.',
    image: 'cover'
  },
  {
    name: 'Sketchcrawl',
    date: '2026-02-15',
    location: 'Old Town',
    description: 'Urban sketching walk and share.',
    image: '' // demonstrate fallback
  },
  {
    name: 'Community Mural Day',
    date: '2026-03-12',
    location: '', // demonstrate TBD
    description: '', // demonstrate TBD
    image: 'cover'
  },
  {
    name: 'Clay Workshop',
    date: '2026-04-02',
    location: 'Studio B',
    description: 'Hands-on clay basics with local ceramicist.',
    image: 'cover'
  },
  {
    name: 'Spring Exhibition',
    date: '2026-05-10',
    location: 'Creative Space Gallery',
    description: 'Group show featuring emerging artists.',
    image: 'cover'
  },
  {
    name: 'Street Art Tour',
    date: '2026-06-01',
    location: 'Zurich West',
    description: 'A guided walk exploring local street art.',
    image: 'cover'
  }
];
