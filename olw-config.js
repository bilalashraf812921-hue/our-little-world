/* ===== Google sync settings (sirf EK jaga bharni hain: Gallery aur Letters dono yehi use karte hain) =====
   Setup (ek baar):
   1) console.firebase.google.com > project banayein > Build > Authentication > Google ENABLE.
   2) Build > Firestore Database banayein, aur Rules mein neeche wale rules paste karein (apni 2 emails ke sath).
   3) Project settings > Your apps > Web app (</>) > config yahan 'firebase' mein paste karein.
   4) Authentication > Settings > Authorized domains mein apni website ka domain add karein.
   5) 'owner' aur 'partner' mein dono Google emails likhein.
   Firestore Rules:
     rules_version = '2';
     service cloud.firestore { match /databases/{db}/documents {
       match /spaces/{space}/{document=**} { allow read, write: if request.auth != null && request.auth.token.email in ['owner@gmail.com','partner@gmail.com']; } } }
   Jab tak khali hai, sab kuch sirf isi browser mein save hota hai. */
window.OLW_SYNC = {
  firebase: { apiKey: 'AIzaSyCHDVCYsbnYexy4oVzUrAr7f5w8g5XPF-Y', authDomain: 'our-little-world-9885a.firebaseapp.com', projectId: 'our-little-world-9885a', appId: '1:248739753048:web:b214bba971a77448252e2d' },
  space: 'our-little-world',
  owner: 'bilalashraf812921@gmail.com',
  partner: 'ahsanali3021733607@gmail.com'
};
