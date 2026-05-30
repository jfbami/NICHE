import { customAlphabet } from 'nanoid';

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
const generate = customAlphabet(alphabet, 8);

export function newUserId() {
  return `usr_${generate()}`;
}

export function newSpotId() {
  return `spot_${generate()}`;
}

export function newPhotoId() {
  return `photo_${generate()}`;
}
