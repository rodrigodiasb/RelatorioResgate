// ======== CONFIG ========
const API_KEY   = 'AIzaSyAPhG1cgx3lbGRQ-dFfJbOeln0K9gp2zJI';
const CLIENT_ID = '346882138198-7m77ofqusaqkkpi6ugoc0mual6ku3ior.apps.googleusercontent.com';
const SHEET_ID  = '1U0jqytxXBRhT9cWaJCOIdlMTKsQhSWibsY6EyQm7qnk';
const SHEET_NAME = 'Avaliacoes'; // nome da aba com o cabeçalho

// ======== CAMPOS/COLUNAS (ordem exata do cabeçalho) ========
const COLS = [
  'id','timestamp','nome','documento','endereco','protocolo',
  'idade','dataNascimento',
  'pressao','prejPressao','frequencia','prejFrequencia','saturacao','prejSaturacao','respiracao','prejRespiracao',
  'glasgow','observacao',
  'medicoRegulador','senha','unidadeSaude',
  'referenciaAdmissao','nomeAdmitiu','macaRetirada',
  'deleted'
];

// ======== ELEMENTOS ========
const form = document.getElementById('formAvaliacao');
const listaAvaliacoes = document.getElementById('lista-avaliacoes');
const mensagemSucesso = document.getElementById('mensagem-sucesso');
const campoPesquisa = document.getElementById('pesquisa');
const btnSignIn = document.getElementById('btnSignIn');
const btnSignOut = document.getElementById('btnSignOut');
const getInput = id => document.getElementById(id);
const getCheckbox = id => document.getElementById(id).checked;
const getRadioValue = name => document.querySelector(`input[name="${name}"]:checked`)?.value || '';
const setRadioValue = (name, value) => {
  const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (radio) radio.checked = true;
};

// ======== ESTADO ========
let tokenClient;
let gapiInited = false;
let gisInited = false;
let authed = false;
let cacheLinhas = []; // {obj,rowNumber}

// ======== INICIALIZAÇÃO OAUTH + GAPI ========
window.addEventListener('load', () => {
  // carrega GAPI quando script estiver pronto
  window.gapiLoaded = async function () {
    await gapi.load('client', initGapiClient);
  };

  // carrega GIS quando script estiver pronto
  window.gisLoaded = function () {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      callback: '', // será definido on demand
    });
    gisInited = true;
    maybeEnableButtons();
  };

  // Esses nomes são chamados pelos scripts externos se você quiser:
  // <script src="https://apis.google.com/js/api.js?onload=gapiLoaded"></script>
  // <script src="https://accounts.google.com/gsi/client" onload="gisLoaded()"></script>
});

// Como incluímos os scripts sem onload acima, chamamos polling simples:
const waitFor = (cond, interval=100, timeout=10000) =>
  new Promise((res, rej) => {
    const start = Date.now();
    const t = setInterval(() => {
      if (cond()) { clearInterval(t); res(); }
      else if (Date.now()-start > timeout) { clearInterval(t); rej(); }
    }, interval);
  });

(async function ensureScripts(){
  try {
    await waitFor(() => window.gapi);
    await initGapiClient();
  } catch {}
  try {
    await waitFor(() => window.google && window.google.accounts && window.google.accounts.oauth2);
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      callback: '',
    });
    gisInited = true;
    maybeEnableButtons();
  } catch {}
})();

async function initGapiClient() {
  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
  });
  gapiInited = true;
  maybeEnableButtons();
}

function maybeEnableButtons() {
  if (gapiInited && gisInited) {
    btnSignIn.disabled = false;
  }
}

btnSignIn.addEventListener('click', () => {
  tokenClient.callback = async (resp) => {
    if (resp.error) throw (resp);
    authed = true;
    btnSignIn.classList.add('oculto');
    btnSignOut.classList.remove('oculto');
    await carregarTudo();
  };
  // se não tem token, pede consentimento
  if (!gapi.client.getToken()) {
    tokenClient.prompt();
  } else {
    // tem token, só renova
    tokenClient.requestAccessToken({ prompt: '' });
  }
});

btnSignOut.addEventListener('click', () => {
  const token = gapi.client.getToken();
  if (token) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken('');
  }
  authed = false;
  btnSignIn.classList.remove('oculto');
  btnSignOut.classList.add('oculto');
  listaAvaliacoes.innerHTML = '';
});

// ======== FUNÇÕES SHEETS ========
async function appendLinha(obj) {
  const values = COLS.map(c => (obj[c] ?? '').toString());
  const range = `${SHEET_NAME}!A:A`;
  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [values] }
  });
}

async function updateLinha(rowNumber, obj) {
  const values = [COLS.map(c => (obj[c] ?? '').toString())];
  const range = `${SHEET_NAME}!A${rowNumber}:Z${rowNumber}`;
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'RAW',
    resource: { values }
  });
}

async function fetchLinhas() {
  const range = `${SHEET_NAME}!A2:Z`; // pula cabeçalho
  const resp = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range
  });
  const rows = resp.result.values || [];
  const list = rows.map((r, i) => {
    const o = {};
    COLS.forEach((c, idx) => { o[c] = r[idx] ?? ''; });
    o.rowNumber = i + 2; // linha real na planilha
    return o;
  });
  return list.filter(x => x.deleted !== '1');
}

// ======== UI / RENDER ========
function renderAvaliacoes(lista) {
  listaAvaliacoes.innerHTML = '';
  const termo = (campoPesquisa.value || '').toLowerCase();

  lista
    .filter(av => (av.nome || '').toLowerCase().includes(termo))
    .sort((a,b) => (b.timestamp||'').localeCompare(a.timestamp||'')) // mais recente primeiro
    .forEach((dados) => {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      li.innerHTML = `
        <strong>${dados.nome || ''}</strong><br>
        <small class="text-muted">${dados.endereco || ''} - Protocolo: ${dados.protocolo || ''}</small><br>
        <button class="btn btn-sm btn-secondary me-2 mt-2" onclick="editar('${dados.id}')">Editar</button>
        <button class="btn btn-sm btn-success me-2 mt-2" onclick="copiar('${dados.id}')">Copiar Avaliação</button>
        <button class="btn btn-sm btn-info me-2 mt-2" onclick="visualizar('${dados.id}')">Visualizar</button>
        <button class="btn btn-sm btn-danger mt-2" onclick="excluir('${dados.id}')">Excluir</button>
      `;
      listaAvaliacoes.appendChild(li);
    });
}

// ======== LÓGICA DE APP ========
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c=>{
    const r = Math.random()*16|0, v = c=='x'?r:(r&0x3|0x8);
    return v.toString(16);
  });
}

async function carregarTudo() {
  cacheLinhas = await fetchLinhas();
  renderAvaliacoes(cacheLinhas);
}

campoPesquisa.addEventListener('input', () => renderAvaliacoes(cacheLinhas));

// Preenche Glasgow 1..15
const glasgowSelect = document.getElementById('glasgow');
if (glasgowSelect) {
  for (let i = 1; i <= 15; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    glasgowSelect.appendChild(option);
  }
}

// CPF máscara (somente números visíveis como CPF)
getInput('documento').addEventListener('input', function () {
  let v = this.value.replace(/\D/g, '');
  if (v.length <= 11) {
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  this.value = v;
});

// Checkbox Prej. desabilita inputs
function bindPrej(campoId, checkboxId) {
  const campo = document.getElementById(campoId);
  const checkbox = document.getElementById(checkboxId);
  if (campo && checkbox) {
    checkbox.addEventListener('change', ()=> { campo.disabled = checkbox.checked; });
    campo.disabled = checkbox.checked;
  }
}
bindPrej('pressao', 'prejPressao');
bindPrej('frequencia','prejFrequencia');
bindPrej('saturacao','prejSaturacao');
bindPrej('respiracao','prejRespiracao');

// Conversor Data Nasc -> Idade
const campoIdade = document.getElementById('idade');
const campoDataNascimento = document.getElementById('dataNascimento');
if (campoIdade && campoDataNascimento) {
  campoDataNascimento.addEventListener('change', () => {
    const dataNasc = new Date(campoDataNascimento.value);
    if (!isNaN(dataNasc)) {
      const hoje = new Date();
      let idade = hoje.getFullYear() - dataNasc.getFullYear();
      const m = hoje.getMonth() - dataNasc.getMonth();
      if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) idade--;
      campoIdade.value = idade;
    }
  });
}

function montarTextoAvaliacao(dados) {
  const getCampo = (chaveRotulo, sufixo = '', prejudicado = false) =>
    prejudicado ? `${chaveRotulo}: prejudicado` : `${chaveRotulo}: ${dados[chaveRotulo] || ''}${sufixo}`;

  const textoAdmissao = (dados.macaRetirada === '1' || dados.macaRetirada === true)
    ? `Vítima admitida aos cuidados do ${dados.referenciaAdmissao || ''} ${dados.nomeAdmitiu || ''} e a maca foi retirada pelo mesmo(a) às ${new Date().toLocaleTimeString()}`
    : `Vítima admitida aos cuidados do ${dados.referenciaAdmissao || ''} ${dados.nomeAdmitiu || ''}`;

  return [
    `Nome: ${dados.nome || ''}`,
    `Documento: ${dados.documento || ''}`,
    `Endereço: ${dados.endereco || ''}`,
    `Protocolo: ${dados.protocolo || ''}`,
    '',
    `pressao: ${dados.prejPressao==='1'?'prejudicado':(dados.pressao||'') + ' mmHg'}`,
    `frequencia: ${dados.prejFrequencia==='1'?'prejudicado':(dados.frequencia||'') + ' bpm'}`,
    `saturacao: ${dados.prejSaturacao==='1'?'prejudicado':(dados.saturacao||'') + ' %'}`,
    `respiracao: ${dados.prejRespiracao==='1'?'prejudicado':(dados.respiracao||'') + ' mrm'}`,
    `Glasgow: ${dados.glasgow || ''}`,
    '',
    `Observações: ${dados.observacao || ''}`,
    '',
    `Médico regulador: ${dados.medicoRegulador || ''}`,
    `Senha: ${dados.senha || ''}`,
    `Unidade de Saúde: ${dados.unidadeSaude || ''}`,
    '',
    textoAdmissao
  ].join('\n');
}

// Editar / Copiar / Excluir / Visualizar (usando cacheLinhas)
window.editar = (id) => {
  const dados = cacheLinhas.find(x => x.id === id);
  if (!dados) return;

  // Preenche campos
  Object.entries(dados).forEach(([k,v]) => {
    if (COLS.includes(k)) {
      const el = document.getElementById(k);
      if (el && !['referenciaAdmissao','macaRetirada','deleted'].includes(k)) el.value = v;
      if (k.startsWith('prej')) {
        const ch = document.getElementById(k);
        if (ch) ch.checked = (v === '1' || v === true);
      }
    }
  });
  setRadioValue('referenciaAdmissao', dados.referenciaAdmissao);
  const maca = document.getElementById('macaRetirada');
  if (maca) maca.checked = (dados.macaRetirada === '1' || dados.macaRetirada === true);

  form.dataset.editandoId = id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  getInput('nome').focus();
};

window.copiar = (id) => {
  const dados = cacheLinhas.find(x => x.id === id);
  if (!dados) return;
  const texto = montarTextoAvaliacao(dados);
  navigator.clipboard.writeText(texto).then(()=> alert('Texto copiado com sucesso!'));
};

window.excluir = async (id) => {
  const alvo = cacheLinhas.find(x => x.id === id);
  if (!alvo) return;
  if (!confirm('Deseja realmente excluir esta avaliação?')) return;

  alvo.deleted = '1';
  await updateLinha(alvo.rowNumber, alvo);
  await carregarTudo();
};

window.visualizar = (id) => {
  const dados = cacheLinhas.find(x => x.id === id);
  if (!dados) return;
  localStorage.setItem('avaliacao_visualizar', JSON.stringify(dados));
  window.open('visualizar.html', '_blank');
};

// SUBMIT
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!authed) { alert('Faça login com Google para salvar.'); return; }

  const dados = {
    id: form.dataset.editandoId || uuid(),
    timestamp: new Date().toISOString(),
    nome: getInput('nome').value,
    documento: getInput('documento').value,
    endereco: getInput('endereco').value,
    protocolo: getInput('protocolo').value,
    idade: getInput('idade').value,
    dataNascimento: getInput('dataNascimento').value,

    pressao: getInput('pressao').value,
    prejPressao: getCheckbox('prejPressao') ? '1' : '',
    frequencia: getInput('frequencia').value,
    prejFrequencia: getCheckbox('prejFrequencia') ? '1' : '',
    saturacao: getInput('saturacao').value,
    prejSaturacao: getCheckbox('prejSaturacao') ? '1' : '',
    respiracao: getInput('respiracao').value,
    prejRespiracao: getCheckbox('prejRespiracao') ? '1' : '',

    glasgow: getInput('glasgow').value,
    observacao: getInput('observacao').value,

    medicoRegulador: getInput('medicoRegulador').value,
    senha: getInput('senha').value,
    unidadeSaude: getInput('unidadeSaude').value,

    referenciaAdmissao: getRadioValue('referenciaAdmissao'),
    nomeAdmitiu: getInput('nomeAdmitiu').value,
    macaRetirada: getCheckbox('macaRetirada') ? '1' : '',
    deleted: ''
  };

  const existe = cacheLinhas.find(x => x.id === dados.id);
  if (existe) {
    dados.rowNumber = existe.rowNumber;
    await updateLinha(existe.rowNumber, dados);
    delete form.dataset.editandoId;
  } else {
    await appendLinha(dados);
  }

  form.reset();
  mensagemSucesso.classList.remove('oculto');
  setTimeout(() => mensagemSucesso.classList.add('oculto'), 2000);

  await carregarTudo();
});
