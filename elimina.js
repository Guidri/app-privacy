// Logica comune delle pagine "Elimina account": l'utente accede con email e password,
// la pagina cancella i suoi dati con la funzione `pulizia` dell'app e poi elimina l'account Firebase.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, deleteUser, sendPasswordResetEmail, signOut }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import * as fs from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

export function avvia({ firebase, pulizia }) {
  const app = initializeApp(firebase);
  const auth = getAuth(app);
  const db = fs.getFirestore(app);

  const $ = (id) => document.getElementById(id);
  const esito = (testo, ok) => { $('esito').textContent = testo; $('esito').className = ok ? 'ok' : 'errore'; };

  const messaggio = (e) => {
    const c = e?.code || '';
    if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) return 'Email o password non corretti.';
    if (c.includes('too-many-requests')) return 'Troppi tentativi: riprova tra qualche minuto.';
    if (c.includes('network')) return 'Nessuna connessione: controlla internet e riprova.';
    return 'Operazione non riuscita. Riprova tra poco.';
  };

  $('modulo').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    $('bottone').disabled = true;
    esito('Eliminazione in corso…', true);
    try {
      const cred = await signInWithEmailAndPassword(auth, $('email').value.trim(), $('password').value);
      const uid = cred.user.uid;
      // Ogni passaggio è indipendente: se uno fallisce (dato già assente) si prosegue
      try { await pulizia({ db, uid, fs }); } catch (e) { console.warn('pulizia', e); }
      await deleteUser(cred.user);
      $('modulo').reset();
      esito('Fatto: il tuo account e i tuoi dati sono stati eliminati.', true);
    } catch (e) {
      await signOut(auth).catch(() => {});
      esito(messaggio(e), false);
    } finally {
      $('bottone').disabled = false;
    }
  });

  $('recupera').addEventListener('click', async () => {
    const email = $('email').value.trim();
    if (!email) { esito('Scrivi prima la tua email qui sopra.', false); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      esito('Se l\'email è registrata, ti abbiamo mandato un link per scegliere una nuova password.', true);
    } catch (e) { esito(messaggio(e), false); }
  });
}

// Utilità: cancella (o modifica) tutti i documenti di una raccolta con campo == uid
export async function perOgni({ db, fs }, raccolta, campo, uid, azione = 'elimina', dati = {}) {
  const snap = await fs.getDocs(fs.query(fs.collection(db, raccolta), fs.where(campo, '==', uid)));
  for (const d of snap.docs) {
    try {
      if (azione === 'elimina') await fs.deleteDoc(d.ref);
      else await fs.updateDoc(d.ref, dati);
    } catch (e) { console.warn(raccolta, d.id, e); }
  }
}
