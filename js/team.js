const teamMembers = [
  { number: '01', name: 'Elson Mupenzi', role: 'President', image: 'elson.PNG', bio: 'Elson brings the club together around books, big questions, and practical care. He believes a good conversation should keep working long after the meeting ends.' },
  { number: '02', name: 'Ketia Wera Utese', role: 'Vice President', image: 'ketia.JPG', bio: 'Ketia helps turn shared ideas into steady action and makes room for every voice in the circle. She is happiest when curiosity becomes community.' },
  { number: '03', name: 'Kagubare Isaro Chrystal', role: 'Secretary General', image: 'chrystal.jpg', bio: 'Chrystal keeps the club’s plans, notes, and good intentions moving in the same direction. Her favourite stories are the ones that invite us to look closer.' },
  { number: '04', name: 'Eva Bigagaza', role: 'Partnerships & Events Lead', image: 'eva2.jpeg', bio: 'Eva brings people together and makes each gathering feel like the beginning of something. She loves a thoughtful plan with space for a little surprise.' },
  { number: '05', name: 'Teddy Junior Irakoze', role: 'Business Administrator', image: 'teddy.jpg', bio: 'Teddy supports the practical side of the club so its community work can keep growing. He values clear plans, steady effort, and the people behind every project.' },
  { number: '06', name: 'Diana Ngarambe', role: 'Finance Coordinator', image: 'diana.JPG', bio: 'Diana keeps the details of the club’s giving thoughtful and well accounted for. She believes trust grows through the small things we do consistently.' },
  { number: '07', name: 'Olecia Nikeza Nshuti', role: 'Social Media Lead', image: 'olecia.jpeg', bio: 'Olecia shares the moments, ideas, and books that make this community what it is. She finds a story worth telling in every gathering.' },
  { number: '08', name: 'Cindy Kalimba', role: 'Assistant Events Lead & Spokesperson', image: 'cindy.jpeg', bio: 'Cindy helps each event run smoothly and gives the club’s work a warm, clear voice. She knows the best conversations often begin with a simple welcome.' },
  { number: '09', name: 'Gavin Kanyoni', role: 'Head of Finance', image: 'gavin.jpeg', bio: 'Gavin looks after the numbers that help the club turn generosity into reliable support. He brings a clear eye, a calm hand, and a belief in doing things well.' },
  { number: '10', name: 'Trisha Ineza Ndahiro', role: 'Head of Administration', image: 'trisha.jpeg', bio: 'Trisha keeps the everyday work of the club organised and welcoming. She believes thoughtful structure gives good ideas room to grow.' },
  { number: '11', name: 'Murwanashyaka Ivan Mafurebo', role: 'Head of Administration', image: 'ivan.jpg', bio: 'Ivan helps keep the club’s many moving pieces connected and on track. He brings patience to the process and purpose to the details.' },
  { number: '12', name: 'Kelly Cyusa', role: 'Head of Communications', image: 'kelly.jpg', bio: 'Kelly helps the club speak with care, clarity, and a little literary spirit. She loves finding just the right words to bring people into the conversation.' }
];

const teamGrid = document.getElementById('team-grid');
const teamModal = document.getElementById('team-modal');
const profileDialog = teamModal.querySelector('.team-profile');
const profileImage = document.getElementById('profile-image');
const closeButton = teamModal.querySelector('.team-close');
let activeMemberIndex = 0;
let returnFocusElement = null;
let previousBodyOverflow = '';

function setImageState(image, frame) {
  image.addEventListener('error', () => frame.classList.add('is-missing'), { once: true });
  image.addEventListener('load', () => frame.classList.remove('is-missing'), { once: true });
  if (image.complete && image.naturalWidth === 0) frame.classList.add('is-missing');
}

function renderTeamCards() {
  teamGrid.innerHTML = teamMembers.map((member, index) => `
    <button class="team-card" type="button" data-member-index="${index}" style="--team-tilt:${[-4, 2, -1, 4, -3, 1, 3, -4, 1, -2, 4, -1][index]}deg" aria-haspopup="dialog" aria-label="Meet ${member.name}, ${member.role}">
      <span class="team-card-frame">
        <span class="team-card-number">${member.number}</span>
        <img src="${member.image}" alt="Portrait of ${member.name}, ${member.role}" loading="lazy" />
      </span>
      <span class="team-card-name">${member.name}</span>
      <span class="team-card-role">${member.role}</span>
    </button>`).join('');

  teamGrid.querySelectorAll('.team-card').forEach((card) => {
    const image = card.querySelector('img');
    setImageState(image, card);
    card.addEventListener('click', () => openProfile(Number(card.dataset.memberIndex), card));
  });
}

function setProfileImage(member) {
  const imageFrame = profileImage.parentElement;
  imageFrame.classList.remove('is-missing');
  profileImage.alt = `Portrait of ${member.name}, ${member.role}`;
  profileImage.src = member.image;
  setImageState(profileImage, imageFrame);
}

function showProfile(index) {
  activeMemberIndex = (index + teamMembers.length) % teamMembers.length;
  const member = teamMembers[activeMemberIndex];
  const [firstName, ...surnameParts] = member.name.split(' ');
  document.getElementById('profile-marker').textContent = `${member.number}/`;
  document.getElementById('profile-index').textContent = `${member.number} / ${String(teamMembers.length).padStart(2, '0')}`;
  document.getElementById('profile-name').innerHTML = `${firstName}<br>${surnameParts.join(' ')}`;
  document.getElementById('profile-role').textContent = member.role;
  document.getElementById('profile-bio').textContent = member.bio;
  document.getElementById('profile-counter').textContent = `${member.number} / ${String(teamMembers.length).padStart(2, '0')}`;
  setProfileImage(member);
}

function openProfile(index, card) {
  returnFocusElement = card;
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  showProfile(index);
  teamModal.hidden = false;
  closeButton.focus();
}

function closeProfile() {
  if (teamModal.hidden) return;
  teamModal.hidden = true;
  document.body.style.overflow = previousBodyOverflow;
  if (returnFocusElement) returnFocusElement.focus();
}

function closeMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobile-nav');
  hamburger.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  mobileNav.classList.remove('open');
}

document.getElementById('hamburger').addEventListener('click', (event) => {
  const hamburger = event.currentTarget;
  const mobileNav = document.getElementById('mobile-nav');
  const isOpen = hamburger.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(isOpen));
  mobileNav.classList.toggle('open', isOpen);
});

teamModal.addEventListener('click', (event) => {
  if (event.target.hasAttribute('data-modal-close')) closeProfile();
});
closeButton.addEventListener('click', closeProfile);
teamModal.querySelectorAll('[data-profile-step]').forEach((button) => {
  button.addEventListener('click', () => showProfile(activeMemberIndex + Number(button.dataset.profileStep)));
});

document.addEventListener('keydown', (event) => {
  if (teamModal.hidden) return;
  if (event.key === 'Escape') closeProfile();
  if (event.key === 'ArrowLeft') showProfile(activeMemberIndex - 1);
  if (event.key === 'ArrowRight') showProfile(activeMemberIndex + 1);
  if (event.key === 'Tab') {
    const focusable = [...profileDialog.querySelectorAll('button:not([disabled])')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

renderTeamCards();