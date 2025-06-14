// script.js

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  const listaAvaliacoes = document.getElementById('lista-avaliacoes');
  const mensagemSucesso = document.getElementById('mensagem-sucesso');
  const campoPesquisa = document.getElementById('pesquisa');

  const getInput = id => document.getElementById(id);
  const getCheckbox = id => document.getElementById(id).checked;
  const getRadioValue = name => document.querySelector(`input[name="${name}"]:checked`)?.value || '';
  const setRadioValue = (name, value) => {
    const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (radio) radio.checked = true;
  };

  let avaliacoes = JSON.parse(localStorage.getItem('avaliacoes')) || [];

  function salvarLocalStorage() {
    localStorage.setItem('avaliacoes', JSON.stringify(avaliacoes));
  }

  function limparFormulario() {
    form.reset();
  }

  function montarTextoAvaliacao(dados) {
    const getCampo = (campo, sufixo = '', prejudicado = false) => {
      return prejudicado ? `${campo}: prejudicado` : `${campo}: ${dados[campo] || ''}${sufixo}`;
    };

    const textoAdmissao = dados.macaRetirada
      ? `Vítima admitida aos cuidados do ${dados.referenciaAdmissao || ''} ${dados.nomeAdmitiu || ''} e a maca foi retirada pelo mesmo(a) às ${new Date().toLocaleTimeString()}`
      : `Vítima admitida aos cuidados do ${dados.referenciaAdmissao || ''} ${dados.nomeAdmitiu || ''}`;

    return [
      `Nome: ${dados.nome || ''}`,
      `Documento: ${dados.documento || ''}`,
      `Endereço: ${dados.endereco || ''}`,
      `Protocolo: ${dados.protocolo || ''}`,
      '',
      getCampo('Pressao', '', dados.prejPressao),
      getCampo('Frequencia', '', dados.prejFrequencia),
      getCampo('Saturacao', '%', dados.prejSaturacao),
      getCampo('Respiracao', '', dados.prejRespiracao),
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
    const glasgowSelect = document.getElementById('glasgow');
if (glasgowSelect) {
  for (let i = 1; i <= 15; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    glasgowSelect.appendChild(option);
  }
}

  function renderAvaliacoes() {
    listaAvaliacoes.innerHTML = '';
    const termo = campoPesquisa.value.toLowerCase();

    avaliacoes.filter(av => av.nome.toLowerCase().includes(termo)).forEach((dados, index) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${dados.nome}</strong><br>
        <button onclick="editar(${index})">Editar</button>
        <button onclick="copiar(${index})">Copiar Avaliação</button>
        <button onclick="excluir(${index})">Excluir</button>
      `;
      listaAvaliacoes.appendChild(li);
    });
  }

  window.editar = index => {
    const dados = avaliacoes[index];
    for (const key in dados) {
      const el = document.getElementById(key);
      if (el && key !== 'referenciaAdmissao') el.value = dados[key];
      if (key.startsWith('prej') && document.getElementById(key)) {
        document.getElementById(key).checked = dados[key];
      }
    }
    setRadioValue('referenciaAdmissao', dados.referenciaAdmissao);
    getInput('macaRetirada').checked = dados.macaRetirada || false;
    form.dataset.editando = index;
  };

  window.copiar = index => {
    const texto = montarTextoAvaliacao(avaliacoes[index]);
    navigator.clipboard.writeText(texto).then(() => alert('Texto copiado com sucesso!'));
  };

  window.excluir = index => {
    if (confirm('Deseja realmente excluir esta avaliação?')) {
      avaliacoes.splice(index, 1);
      salvarLocalStorage();
      renderAvaliacoes();
    }
  };

  form.addEventListener('submit', e => {
    e.preventDefault();
    const dados = {
      nome: getInput('nome').value,
      documento: getInput('documento').value,
      endereco: getInput('endereco').value,
      protocolo: getInput('protocolo').value,
      pressao: getInput('pressao').value,
      frequencia: getInput('frequencia').value,
      saturacao: getInput('saturacao').value,
      respiracao: getInput('respiracao').value,
      glasgow: getInput('glasgow').value,
      observacao: getInput('observacao').value,
      medicoRegulador: getInput('medicoRegulador').value,
      senha: getInput('senha').value,
      unidadeSaude: getInput('unidadeSaude').value,
      referenciaAdmissao: getRadioValue('referenciaAdmissao'),
      nomeAdmitiu: getInput('nomeAdmitiu').value,
      macaRetirada: getCheckbox('macaRetirada'),
      prejPressao: getCheckbox('prejPressao'),
      prejFrequencia: getCheckbox('prejFrequencia'),
      prejSaturacao: getCheckbox('prejSaturacao'),
      prejRespiracao: getCheckbox('prejRespiracao')
    };

    if (form.dataset.editando) {
      avaliacoes[form.dataset.editando] = dados;
      delete form.dataset.editando;
    } else {
      avaliacoes.push(dados);
    }

    salvarLocalStorage();
    renderAvaliacoes();
    limparFormulario();
    mensagemSucesso.classList.remove('oculto');
    setTimeout(() => mensagemSucesso.classList.add('oculto'), 2000);
  });

  campoPesquisa.addEventListener('input', renderAvaliacoes);
  renderAvaliacoes();
});
