// Comportamentos de interface apenas: as regras de negócio ficam no servidor.

// Botões "Copiar": copiam o texto do elemento indicado em data-copy.
document.querySelectorAll('[data-copy]').forEach((botao) => {
  botao.addEventListener('click', async () => {
    const alvo = document.querySelector(botao.dataset.copy);
    if (!alvo) return;
    try {
      await navigator.clipboard.writeText(alvo.textContent.trim());
      botao.textContent = 'Copiado!';
    } catch {
      botao.textContent = 'Não foi possível copiar';
    }
    setTimeout(() => {
      botao.textContent = 'Copiar';
    }, 2000);
  });
});

// Envia o fuso do navegador para o servidor interpretar a data de expiração.
document.querySelectorAll('form').forEach((form) => {
  const fuso = form.querySelector('input[name="timezoneOffset"]');
  const expiracao = form.querySelector('input[name="expiresAt"]');
  if (!fuso) return;
  form.addEventListener('submit', () => {
    const data = expiracao && expiracao.value ? new Date(expiracao.value) : new Date();
    fuso.value = String(data.getTimezoneOffset());
  });
});

// Gráfico de cliques da página de estatísticas (Chart.js carregado via CDN).
const grafico = document.getElementById('grafico-cliques');
if (grafico && window.Chart) {
  new window.Chart(grafico, {
    type: 'line',
    data: {
      labels: JSON.parse(grafico.dataset.labels),
      datasets: [
        {
          label: 'Cliques',
          data: JSON.parse(grafico.dataset.values),
          borderColor: '#3b3fc4',
          backgroundColor: 'rgba(59, 63, 196, 0.15)',
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}
