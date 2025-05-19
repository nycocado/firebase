import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
import { setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDnwXtyWpsHQVwfQHcRPcalh6cfo-Me3bM",
    authDomain: "nycocadotaskfb.firebaseapp.com",
    projectId: "nycocadotaskfb",
    storageBucket: "nycocadotaskfb.firebasestorage.app",
    messagingSenderId: "1059203962687",
    appId: "1:1059203962687:web:7a0dc705484705558b258a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);

if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            window.location.href = "perfil.html";
        } else {
            window.location.href = "login.html";
        }
    });
}

async function checkUserExistsInFirestore(uid) {
    try {
        const userDocRef = doc(db, "users", uid);
        const docSnap = await getDoc(userDocRef);
        return docSnap.exists();
    } catch (error) {
        console.error("Erro ao verificar usuário no Firestore:", error);
        throw error;
    }
}

const googleLoginButton = document.getElementById("googleLoginButton");
if (googleLoginButton) {
    googleLoginButton.addEventListener("click", async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            const userExists = await checkUserExistsInFirestore(user.uid);

            if (userExists) {
                window.location.href = "perfil.html";
            } else {
                localStorage.setItem("pendingUser", JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL
                }));
                window.location.href = "cadastro.html";
            }
        } catch (error) {
            console.error("Erro durante o login com Google:", error);
        }
    });
}

const cadastroForm = document.querySelector("form");
const photoInput = document.getElementById("photo");
const previewContainer = document.getElementById("preview-container");
const previewImage = document.getElementById("preview");

if (cadastroForm) {
    photoInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                previewImage.classList.remove("d-none");
            };
            reader.readAsDataURL(file);
        } else {
            previewImage.src = "";
            previewImage.classList.add("d-none");
        }
    });

    cadastroForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = document.getElementById("name").value;
        const dob = document.getElementById("dob").value;
        const address = document.getElementById("address").value;
        const username = document.getElementById("username").value;
        const phone = document.getElementById("phone").value;
        const photo = photoInput.files[0];

        const pendingUser = JSON.parse(localStorage.getItem("pendingUser"));

        if (!pendingUser) {
            document.getElementById("error").innerText = "Erro: Nenhum usuário pendente encontrado.";
            return;
        }

        try {
            let photoURL = "";

            if (photo) {
                const storageRef = ref(storage, `users/${pendingUser.uid}/profile.jpg`);
                await uploadBytes(storageRef, photo);
                photoURL = await getDownloadURL(storageRef);
            }

            const userDocRef = doc(db, "users", pendingUser.uid);
            await setDoc(userDocRef, {
                name,
                dob,
                address,
                username,
                phone,
                email: pendingUser.email,
                displayName: pendingUser.displayName,
                photoURL: photoURL || pendingUser.photoURL
            });

            localStorage.removeItem("pendingUser");
        } catch (error) {
            console.error("Erro ao cadastrar usuário:", error);
        }
    });
}

const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        try {
            await auth.signOut();
            window.location.href = "login.html";
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
        }
    });
}

if (window.location.pathname.endsWith("perfil.html")) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();

                    document.querySelector("#preview").src = userData.photoURL || "";
                    document.querySelector("#preview").classList.remove("d-none");
                    document.querySelector("#preview-placeholder").classList.add("d-none");

                    document.querySelector("#preview-container").style.backgroundColor = "transparent";

                    document.querySelector("#preview").alt = `Foto de ${userData.name}`;

                    document.querySelector("#name").value = userData.name || "";
                    document.querySelector("#dob").value = userData.dob || "";
                    document.querySelector("#address").value = userData.address || "";
                    document.querySelector("#username").value = userData.username || "";
                    document.querySelector("#phone").value = userData.phone || "";

                    toggleInputs(true);

                    const editButton = document.getElementById("saveChangesButton");
                    editButton.innerText = "Editar";
                    editButton.addEventListener("click", (event) => {
                        event.preventDefault();
                        if (editButton.innerText === "Editar") {
                            toggleInputs(false);
                            editButton.innerText = "Salvar";
                        } else {
                            saveProfileChanges(user.uid);
                            editButton.innerText = "Editar";
                        }
                    });
                } else {
                    console.error("Usuário não encontrado no Firestore.");
                }
            } catch (error) {
                console.error("Erro ao buscar dados do usuário:", error);
            }
        } else {
            window.location.href = "login.html";
        }
    });
}

function toggleInputs(disabled) {
    const inputs = document.querySelectorAll("#profileForm input");
    inputs.forEach(input => input.disabled = disabled);
}

async function saveProfileChanges(uid) {
    try {
        const name = document.getElementById("name").value;
        const dob = document.getElementById("dob").value;
        const address = document.getElementById("address").value;
        const username = document.getElementById("username").value;
        const phone = document.getElementById("phone").value;
        const photoInput = document.getElementById("photo");
        const photo = photoInput.files[0];

        let photoURL = "";

        if (photo) {
            const storageRef = ref(storage, `users/${uid}/profile.jpg`);
            await uploadBytes(storageRef, photo);
            photoURL = await getDownloadURL(storageRef);
        }

        const userDocRef = doc(db, "users", uid);
        await setDoc(userDocRef, {
            name,
            dob,
            address,
            username,
            phone,
            ...(photoURL && { photoURL })
        }, { merge: true });

        toggleInputs(true);
    } catch (error) {
        console.error("Erro ao salvar alterações:", error);
    }
}
