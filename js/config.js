/**
 * Configuração do site — edite apenas os valores abaixo.
 * Este arquivo deve ser carregado ANTES de js/app.js no index.html.
 */
window.APP_CONFIG = {
  // Cole aqui a URL do Webhook do n8n (método POST).
  WEBHOOK_URL: 'COLE_A_URL_DO_N8N_AQUI',

  // Nome do parâmetro de query string usado para identificar o e-mail do cliente.
  // Ex.: https://seusite.com/?e-mail=cliente@empresa.com
  EMAIL_PARAM: 'e-mail',

  // Links de agendamento por CS, hardcoded enquanto o webhook do n8n não
  // retorna a URL de cada responsável. A chave deve ser IGUAL ao "nome" que
  // vem (ou virá) do webhook. Se o webhook já enviar "url" para uma pessoa,
  // o valor do webhook tem prioridade sobre este mapa.
  CALENDAR_LINKS: {
    'Evelyn Celestino': 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ1vqdWre8SZxIVb21R3-p5MVTo_WVi5shMPfFs63zgzmNtEQ3kvYBiv83OkgZF_FIBSi9mqVfO3',
    'Luana': 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2LKK8A08dP00gDuS8gUFc_aoLVTVbuj5qblxS-ZoUpS5e3_aT5fIMEC1q17LWxAG42SR8nRmAV',
    'Agna Luiza': 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ1robAlzoDKTgUmMsFiQCbfFTdNA0ASFnk7HQcWqk72xbv8cdpNv5CLhJnjxOMSdkn2Tj4jD1Xh',
    'Christiam Santana': 'https://calendar.app.google/XZmDGfbxvPHjUMX29',
    'Gabriella': 'https://calendar.app.google/NS1UxtzCjZKEqRRy8',
    'Mariany': 'https://calendar.app.google/PQ5zUzKdDNQiQH3G6'
  }
};
