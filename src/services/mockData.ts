export interface Club {
  id: string;
  name: string;
  description: string;
  category: string;
  coverImage?: string;
  logoUrl?: string;
  memberCount: number;
  coordinatorIds: string[];
}

export interface Event {
  id: string;
  clubId: string;
  clubName: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  entryFee: number;
  upiId: string;
  coverImage?: string;
  coordinatorIds: string[];
}

export interface Registration {
  id: string;
  eventId: string;
  eventTitle: string;
  clubName: string;
  clubId: string;
  userId: string;
  userName: string;
  userEmail: string;
  fee?: number;
  paymentProofUrl?: string;
  status: 'pending' | 'approved' | 'attended' | 'rejected';
  createdAt: number;
  qrPayload?: string;
  certificateUrl?: string;
}

export interface Post {
  id: string;
  clubId: string;
  clubName: string;
  content: string;
  imageUrl?: string;
  likesCount: number;
  createdAt: number;
}

export const MOCK_CLUBS: Club[] = [
  {
    id: 'club-devs',
    name: 'Turing Devs Club',
    description: 'The premier software engineering and open-source club on campus. We build mobile apps, host hackathons, and hold weekly coding jams.',
    category: 'Technical',
    coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop',
    logoUrl: 'https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=120&auto=format&fit=crop',
    memberCount: 142,
    coordinatorIds: ['mock-coordinator-123']
  },
  {
    id: 'club-gdsc',
    name: 'Google Developer Groups',
    description: 'Google Developer Student Clubs helps students bridge the gap between theory and practice through workshops, project builds, and tech talks.',
    category: 'Technical',
    coverImage: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&auto=format&fit=crop',
    logoUrl: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=120&auto=format&fit=crop',
    memberCount: 289,
    coordinatorIds: ['mock-coordinator-456']
  },
  {
    id: 'club-dance',
    name: 'Rythmics Dance Crew',
    description: 'Campus dance crew covering Hip-Hop, Contemporary, Classical, and Fusion styles. Winners of consecutive inter-college cultural events!',
    category: 'Cultural',
    coverImage: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop',
    logoUrl: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=120&auto=format&fit=crop',
    memberCount: 88,
    coordinatorIds: []
  },
  {
    id: 'club-sports',
    name: 'Strikers Football Club',
    description: 'The campus football association. We organize the annual inter-department tournament, hold regular training sessions, and host match viewings.',
    category: 'Sports',
    coverImage: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop',
    logoUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013B?w=120&auto=format&fit=crop',
    memberCount: 120,
    coordinatorIds: []
  },
  {
    id: 'club-arts',
    name: 'Fine Arts Society',
    description: 'Explore sketching, painting, digital illustrations, and photography. We host monthly campus galleries and mural painting drives.',
    category: 'Arts',
    coverImage: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600&auto=format&fit=crop',
    logoUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=120&auto=format&fit=crop',
    memberCount: 64,
    coordinatorIds: []
  }
];

export const MOCK_EVENTS: Event[] = [
  {
    id: 'event-hack',
    clubId: 'club-devs',
    clubName: 'Turing Devs Club',
    title: 'HackCampus 2026',
    description: 'A 24-hour sprint to build solutions for real-world campus problems. Prize pool of ₹50,000, free meals, and amazing swag for all participants! Bring your laptops and team members.',
    date: '2026-06-15',
    time: '09:00 AM',
    venue: 'Main Auditorium Hall B',
    entryFee: 150,
    upiId: 'turingdevs@upi',
    coverImage: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop',
    coordinatorIds: ['mock-coordinator-123']
  },
  {
    id: 'event-ai',
    clubId: 'club-gdsc',
    clubName: 'Google Developer Groups',
    title: 'Generative AI Workshop',
    description: 'An introductory hands-on session on GenAI, LLMs, and integration with modern web and mobile projects. No prior AI experience required!',
    date: '2026-06-18',
    time: '02:00 PM',
    venue: 'Seminar Hall 3',
    entryFee: 0,
    upiId: 'gdsc@upi',
    coverImage: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=600&auto=format&fit=crop',
    coordinatorIds: ['mock-coordinator-456']
  },
  {
    id: 'event-showcase',
    clubId: 'club-dance',
    clubName: 'Rythmics Dance Crew',
    title: 'Summer Dance Showcase',
    description: 'Witness the energy and grace of Rythmics Dance Crew in our annual showcase. Special performances from guest artists and dynamic collaborative acts!',
    date: '2026-06-25',
    time: '06:30 PM',
    venue: 'Open Air Theatre (OAT)',
    entryFee: 50,
    upiId: 'rythmics@upi',
    coverImage: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop',
    coordinatorIds: []
  }
];

export const MOCK_POSTS: Post[] = [
  {
    id: 'post-1',
    clubId: 'club-devs',
    clubName: 'Turing Devs Club',
    content: '🚀 Register now for HackCampus 2026! Check out the details page in the Explore tab. Registration closes on June 10th. Do not miss the chance to win prizes worth ₹50,000!',
    likesCount: 42,
    createdAt: Date.now() - 3600000 * 2, // 2 hours ago
    imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop'
  },
  {
    id: 'post-2',
    clubId: 'club-gdsc',
    clubName: 'Google Developer Groups',
    content: 'Excited to announce our Generative AI Workshop! We will cover prompt engineering, building AI bots, and deploying them to Firebase. Completely free to attend, RSVP now! 💻✨',
    likesCount: 29,
    createdAt: Date.now() - 3600000 * 12, // 12 hours ago
  },
  {
    id: 'post-3',
    clubId: 'club-dance',
    clubName: 'Rythmics Dance Crew',
    content: 'Sneak peek from our practice session for the Summer Dance Showcase! Hard work and pure passion in progress. 🕺💃 Grab your tickets from the Explore page.',
    likesCount: 73,
    createdAt: Date.now() - 86400000 * 1.5, // 1.5 days ago
    imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop'
  }
];

export const MOCK_REGISTRATIONS: Registration[] = [
  {
    id: 'reg-1',
    eventId: 'event-hack',
    eventTitle: 'HackCampus 2026',
    clubName: 'Turing Devs Club',
    clubId: 'club-devs',
    userId: 'mock-student-123',
    userName: 'John Student',
    userEmail: 'student@college.ac.in',
    fee: 150,
    status: 'approved',
    createdAt: Date.now() - 86400000,
    qrPayload: JSON.stringify({ registrationId: 'reg-1', eventId: 'event-hack', userId: 'mock-student-123' })
  }
];

export const MOCK_STUDENT_PROFILE = {
  id: 'mock-student-123',
  fullName: 'John Student',
  email: 'student@college.ac.in',
  college: 'Nanyang Institute of Technology',
  roles: ['student'] as ('student' | 'coordinator' | 'admin')[],
  interests: ['Coding', 'Music', 'Sports'],
  joinedClubs: ['club-devs', 'club-gdsc'],
  createdAt: Date.now() - 86400000 * 10
};

export const MOCK_COORDINATOR_PROFILE = {
  id: 'mock-coordinator-123',
  fullName: 'Jane Coordinator',
  email: 'coordinator@college.ac.in',
  college: 'Nanyang Institute of Technology',
  roles: ['coordinator'] as ('student' | 'coordinator' | 'admin')[],
  interests: ['Hackathons', 'Teaching', 'Tech Management'],
  joinedClubs: ['club-devs'],
  createdAt: Date.now() - 86400000 * 30
};

export function getMockClubs() {
  return MOCK_CLUBS;
}

export function getMockEvents() {
  return MOCK_EVENTS;
}

export function getMockPosts() {
  return MOCK_POSTS;
}

export function getMockRegistrations() {
  return MOCK_REGISTRATIONS;
}
