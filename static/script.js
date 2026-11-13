const chatBox = document.getElementById('chatBox');
const messageInput = document.getElementById('messageInput');
const originInput = document.getElementById('originInput');
const micButton = document.getElementById('micBtn');
const sessionStorageKey = 'capibot-session-id';
let recognition = null;

document.getElementById('contrastBtn').addEventListener('click', toggleContrast);
document.getElementById('speakBtn').addEventListener('click', speakWelcome);
document.getElementById('chatForm').addEventListener('submit', (event) => {
    event.preventDefault();
    sendMessage(messageInput.value);
});
document.querySelectorAll('.chip').forEach((button) => {
    button.addEventListener('click', () => sendMessage(button.dataset.prompt));
});
micButton.addEventListener('click', startVoiceRecognition);
document.getElementById('ticketForm').addEventListener('submit', submitTicket);

function getSessionId() {
    try {
        return localStorage.getItem(sessionStorageKey) || '';
    } catch (_error) {
        return '';
    }
}

function saveSessionId(sessionId) {
    try {
        localStorage.setItem(sessionStorageKey, sessionId);
    } catch (_error) {
        appendMessage('A sessão não será mantida após fechar esta página.', 'bot');
    }
}

function toggleContrast() {
    const enabled = document.body.classList.toggle('high-contrast');
    document.getElementById('contrastBtn').setAttribute('aria-pressed', String(enabled));
}

async function sendMessage(text) {
    const message = text.trim();
    if (!message) return;

    appendMessage(message, 'user');
    messageInput.value = '';

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                origin: originInput.value.trim(),
                session_id: getSessionId()
            })
        });
        const result = await response.json();
        if (result.session_id) saveSessionId(result.session_id);
        if (!response.ok) throw new Error(result.error || 'Não foi possível enviar a mensagem.');
        appendMessage(result.reply, 'bot');
    } catch (error) {
        appendMessage(error.message || 'Falha de conexão. Tente novamente.', 'bot');
    }
}

function startVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        appendMessage('Reconhecimento de voz indisponível neste navegador. Digite sua pergunta.', 'bot');
        messageInput.focus();
        return;
    }
    if (recognition) {
        recognition.stop();
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.onstart = () => {
        micButton.classList.add('listening');
        micButton.textContent = '🛑';
        micButton.setAttribute('aria-label', 'Parar reconhecimento de voz');
    };
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        messageInput.value = transcript;
        sendMessage(transcript);
    };
    recognition.onerror = (event) => {
        if (event.error !== 'aborted') {
            appendMessage('Não consegui reconhecer a fala. Tente novamente ou digite sua pergunta.', 'bot');
        }
    };
    recognition.onend = () => {
        recognition = null;
        micButton.classList.remove('listening');
        micButton.textContent = '🎙️';
        micButton.setAttribute('aria-label', 'Iniciar reconhecimento de voz');
    };
    recognition.start();
}

async function submitTicket(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.append('origin', originInput.value.trim());
    formData.append('session_id', getSessionId());

    try {
        const response = await fetch('/api/tickets', { method: 'POST', body: formData });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Não foi possível registrar o chamado.');
        saveSessionId(result.session_id);
        appendMessage(`${result.message} Número: #${result.ticket_id}.`, 'bot');
        form.reset();
    } catch (error) {
        appendMessage(error.message || 'Falha de conexão. Tente novamente.', 'bot');
    }
}

function appendMessage(text, sender) {
    const message = document.createElement('div');
    message.className = `message ${sender}`;
    message.textContent = `${sender === 'bot' ? '🤖 ' : '👤 '}${text}`;
    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function speakWelcome() {
    if (!('speechSynthesis' in window)) {
        appendMessage('Síntese de voz não suportada neste navegador.', 'bot');
        return;
    }
    const utterance = new SpeechSynthesisUtterance(
        'Olá, eu sou o CapiBot. Como posso ajudar na sua experiência no Capim Dourado Shopping hoje?'
    );
    utterance.lang = 'pt-BR';
    window.speechSynthesis.speak(utterance);
}
