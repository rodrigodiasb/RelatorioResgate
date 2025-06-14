// script.js

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  const listaAvaliacoes = document.getElementById('lista-avaliacoes');
  const mensagemSucesso = document.getElementById('mensagem-sucesso');
  const campoPesquisa = document.getElementById('pesquisa');

  const getInput = id => document.getElementById(id);
  const getCheckbox = id => document.getElementById(id).checked;
  const getRadioValue = name => document.querySelector(`input[name="${name}"]:checked`)?.value || '';

  let avaliacoes = JSON.parse(localStorage.getItem('avaliacoes')) || [];

  function salvarLocalStorage() {
    localStorage.setItem('avaliacoes', JSON.stringify(avaliacoes));
  }

  function limparFormulario() {
    form.reset();
    delete form.dataset.editando;
  }

  function formatarCPF(valor) {
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length === 11) {
      return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return valor;
  }

  function montarTextoAvaliacao(dados) {
    const getCampo = (campo, sufixo = '', prejudicado = false) => {
      return prejudicado ? `${campo}: prejudicado` : `${campo}: ${dados[campo] || ''}${sufixo}`;
    };

    return [
      `Nome: ${dados.nome || ''}`,
      `Documento: ${dados.documento || ''}`,
      `Endereço: ${dados.endereco || ''}`,
      '',
      getCampo('pressao', '', dados.prejPressao),
      getCampo('frequencia', '', dados.prejFrequencia),
      getCampo('saturacao', '%', dados.prejSaturacao),
      getCampo('respiracao', '', dados.prejRespiracao),
      `Glasgow: ${dados.glasgow || ''}`,
      '',
      `Observações: ${dados.observacao || ''}`,
      '',
      `Médico regulador: ${dados.medicoRegulador || ''}`,
      `Senha: ${dados.senha || ''}`,
      `Unidade de Saúde: ${dados.unidadeSaude || ''}`,
      '',
      `Vítima admitida aos cuidados do ${dados.referenciaAdmissao || ''} ${dados.nomeAdmitiu || ''}`
    ].join('\n');
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
      if (el) {
        if (el.type === 'checkbox') {
          el.checked = dados[key];
        } else if (el.type === 'radio') {
          const radio = document.querySelector(`input[name="${el.name}"][value="${dados[key]}"]`);
          if (radio) radio.checked = true;
        } else {
          el.value = dados[key];
        }
      }
    }
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

  getInput('documento').addEventListener('blur', () => {
    const input = getInput('documento');
    input.value = formatarCPF(input.value);
  });

  const prejudicadoCheckBoxes = ['prejPressao', 'prejFrequencia', 'prejSaturacao', 'prejRespiracao'];
  prejudicadoCheckBoxes.forEach(id => {
    document.getElementById(id).addEventListener('change', e => {
      const inputRelacionado = id.replace('prej', '').toLowerCase();
      const campo = getInput(inputRelacionado);
      if (e.target.checked) {
        campo.disabled = true;
        campo.value = '';
      } else {
        campo.disabled = false;
      }
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const dados = {
      nome: getInput('nome').value,
      documento: getInput('documento').value,
      endereco: getInput('endereco').value,
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
      prejPressao: getCheckbox('prejPressao'),
      prejFrequencia: getCheckbox('prejFrequencia'),
      prejSaturacao: getCheckbox('prejSaturacao'),
      prejRespiracao: getCheckbox('prejRespiracao')
    };

    if (form.dataset.editando) {
      avaliacoes[form.dataset.editando] = dados;
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
