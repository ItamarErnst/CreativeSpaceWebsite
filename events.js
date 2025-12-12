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
    name: 'Holiday Makers Fair',
    date: '2025-12-20',
    location: 'Creative Space, Langstrasse 11',
    description: 'Handmade gifts market and mini-workshops.',
    // Multi-image example for the Next Event section
    images: [
      'images/nextEvent/cover.png',
      'images/art1.png',
      'images/art2.png'
    ]
  },
  {
    name: 'Winter Pop‑Up',
    date: '2026-01-24',
    location: 'Zurich',
    description: 'An intimate evening of live painting, music and cocoa.',
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
