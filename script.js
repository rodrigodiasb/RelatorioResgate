const API_KEY   = 'AIzaSyAPhG1cgx3lbGRQ-dFfJbOeln0K9gp2zJI';
const CLIENT_ID = '346882138198-7m77ofqusaqkkpi6ugoc0mual6ku3ior.apps.googleusercontent.com';
const SHEET_ID  = '1U0jqytxXBRhT9cWaJCOIdlMTKsQhSWibsY6EyQm7qnk';
const SHEET_NAME = 'Avaliacoes';

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
let gapiInited = false;
let gisInited = false;

function gapiLoaded() {
  gapi.load('client:auth2', initClient);
}

async function initClient() {
  await gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    scope: SCOPES,
  });
  if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
    await gapi.auth2.getAuthInstance().signIn();
  }
  listarAvaliacoes();
}

// Salvar Avaliação
document.getElementById('form-avaliacao').addEventListener('submit', async (e) => {
  e.preventDefault();
  const dados = {
    nome: document.getElementById('nome').value,
    documento: document.getElementById('documento').value,
    endereco: document.getElementById('endereco').value,
    protocolo: document.getElementById('protocolo').value,
    idade: document.getElementById('idade').value,
    dataNascimento: document.getElementById('dataNascimento').value,
    pressao: document.getElementById('pressao').value,
    frequencia: document.getElementById('frequencia').value,
    saturacao: document.getElementById('saturacao').value,
    respiracao: document.getElementById('respiracao').value,
    glasgow: document.getElementById('glasgow').value,
    observacao: document.getElementById('observacao').value,
    medicoRegulador: document.getElementById('medicoRegulador').value,
    senha: document.getElementById('senha').value,
    unidadeSaude: document.getElementById('unidadeSaude').value,
    referenciaAdmissao: document.querySelector('input[name="referenciaAdmissao"]:checked')?.value || '',
    nomeAdmitiu: document.getElementById('nomeAdmitiu').value,
    macaRetirada: document.getElementById('macaRetirada').checked ? 'Sim' : 'Não'
  };

  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: SHEET_NAME,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [Object.values(dados)] }
  });

  document.getElementById('mensagem-sucesso').classList.remove('oculto');
  listarAvaliacoes();
});

// Listar Avaliações
async function listarAvaliacoes() {
  const response = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: SHEET_NAME
  });

  const listaAvaliacoes = document.getElementById('lista-avaliacoes');
  listaAvaliacoes.innerHTML = '';

  const values = response.result.values;
  if (!values || values.length === 0) return;

  values.slice(1).reverse().forEach((row, index) => {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.innerHTML = `
      <strong>${row[0]}</strong><br>
      <small class="text-muted">${row[2] || ''} - Protocolo: ${row[3] || ''}</small><br>
    `;
    listaAvaliacoes.appendChild(li);
  });
}