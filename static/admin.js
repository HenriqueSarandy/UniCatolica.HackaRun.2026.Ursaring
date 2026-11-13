const ticketList = document.getElementById('ticketList');

async function loadTickets() {
    try {
        const response = await fetch('/api/admin/tickets');
        if (!response.ok) throw new Error('Não foi possível carregar os chamados.');
        const tickets = await response.json();
        renderTickets(tickets);
    } catch (error) {
        ticketList.textContent = error.message || 'Falha ao atualizar os chamados.';
    }
}

function renderTickets(tickets) {
    ticketList.replaceChildren();
    if (tickets.length === 0) {
        ticketList.textContent = 'Ainda não há chamados registrados.';
        return;
    }

    tickets.forEach((ticket) => {
        const card = document.createElement('article');
        card.className = 'ticket-card';
        const heading = document.createElement('h2');
        heading.textContent = `Chamado #${ticket.id} — ${ticket.status}`;
        const message = document.createElement('p');
        message.textContent = ticket.message;
        const details = document.createElement('p');
        details.textContent = `Local: ${ticket.origin} | ${new Date(ticket.created_at).toLocaleString('pt-BR')}`;
        card.append(heading, message, details);

        if (ticket.photo_url) {
            const image = document.createElement('img');
            image.src = ticket.photo_url;
            image.alt = `Foto anexada ao chamado ${ticket.id}`;
            image.className = 'ticket-photo';
            card.append(image);
        }
        ticketList.append(card);
    });
}

loadTickets();
window.setInterval(loadTickets, 5000);
