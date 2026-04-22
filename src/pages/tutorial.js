import { renderLayout } from '../main.js';

export function renderTutorial() {
  renderLayout('Tutorial de Uso', 'Aprenda a usar o Control Igreja', `
    <style>
      .tutorial-hero {
        background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 40px;
        text-align: center;
        margin-bottom: 30px;
        box-shadow: var(--shadow-md);
      }
      .tutorial-hero h1 { font-family: var(--font-serif); font-size: 2.2rem; color: var(--accent); margin-bottom: 10px; }
      .tutorial-hero p { color: var(--text-secondary); font-size: 1.1rem; max-width: 600px; margin: 0 auto; }
      
      .tutorial-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 40px; }
      
      .tutorial-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 0;
        overflow: hidden;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .tutorial-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-lg); border-color: var(--accent); }
      
      .tutorial-img-placeholder {
        height: 160px;
        background: linear-gradient(135deg, var(--bg-tertiary), var(--bg-primary));
        display: flex;
        align-items: center;
        justify-content: center;
        border-bottom: 1px solid var(--border);
        font-size: 3rem;
        position: relative;
      }
      .tutorial-img-placeholder::after {
        content: '';
        position: absolute;
        bottom: 0; left: 0; right: 0; height: 1px;
        background: linear-gradient(90deg, transparent, var(--accent), transparent);
        opacity: 0.5;
      }
      
      .tutorial-content { padding: 24px; }
      .tutorial-step-badge {
        display: inline-block;
        padding: 4px 10px;
        background: rgba(212, 175, 55, 0.1);
        color: var(--accent);
        border: 1px solid rgba(212, 175, 55, 0.3);
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 700;
        margin-bottom: 12px;
      }
      .tutorial-content h3 { font-size: 1.25rem; font-family: var(--font-serif); margin-bottom: 12px; color: var(--text-primary); }
      .tutorial-content p { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px; }
      .tutorial-content ul { list-style: none; padding: 0; margin: 0; }
      .tutorial-content li { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px; display: flex; align-items: flex-start; gap: 8px; }
      .tutorial-content li::before { content: '✓'; color: var(--success); font-weight: bold; }
    </style>

    <div class="tutorial-hero">
      <div style="font-size: 3.5rem; margin-bottom: 15px;">📖</div>
      <h1>Bem-vindo ao Control Igreja</h1>
      <p>Um guia completo para você configurar sua igreja e dar os primeiros passos no sistema em menos de 10 minutos.</p>
    </div>

    <div class="tutorial-grid">
      
      <!-- STEP 1 -->
      <div class="tutorial-card">
        <div class="tutorial-img-placeholder">⛪</div>
        <div class="tutorial-content">
          <span class="tutorial-step-badge">Passo 1</span>
          <h3>Cadastre a sua Igreja</h3>
          <p>O primeiro passo é registrar a sua igreja no sistema e subir a logo oficial, que será impressa em todos os seus recibos em PDF.</p>
          <ul>
            <li>Vá no menu <b>Igrejas</b></li>
            <li>Clique no botão dourado <b>Nova Igreja</b></li>
            <li>Faça o upload do arquivo de Imagem (Logo)</li>
            <li>Preencha o Nome e Endereço, e clique em <b>Salvar</b></li>
            <li>Clique em <b>✅ Selecionar</b> para ativá-la no painel</li>
          </ul>
        </div>
      </div>

      <!-- STEP 2 -->
      <div class="tutorial-card">
        <div class="tutorial-img-placeholder">👥</div>
        <div class="tutorial-content">
          <span class="tutorial-step-badge">Passo 2</span>
          <h3>Cadastro de Membros</h3>
          <p>Adicione os membros, líderes e congregados. Com a lista de membros preenchida, o financeiro poderá gerar recibos nominais automaticamente.</p>
          <ul>
            <li>Acesse o menu <b>Membros</b></li>
            <li>Clique em <b>+ Novo Membro</b></li>
            <li>Preencha o Nome, Telefone e defina o Status (Ativo/Inativo) e o Cargo (Membro, Pastor, Líder, etc.)</li>
          </ul>
        </div>
      </div>

      <!-- STEP 3 -->
      <div class="tutorial-card">
        <div class="tutorial-img-placeholder">💰</div>
        <div class="tutorial-content">
          <span class="tutorial-step-badge">Passo 3</span>
          <h3>Gestão da Tesouraria</h3>
          <p>Lance entradas (dízimos e ofertas) e saídas (despesas operacionais) de forma organizada, podendo gerar PDFs e fazer conciliação bancária.</p>
          <ul>
            <li>Vá no menu integrado <b>Financeiro</b></li>
            <li>Cadastre as <b>Contas Bancárias</b> na aba "Contas"</li>
            <li>Cadastre os <b>Fornecedores</b> na aba "Fornecedores"</li>
            <li>Clique em <b>+ Lançamento</b> na aba Transações</li>
            <li>Ao lançar Dízimo, selecione um membro cadastrado</li>
          </ul>
        </div>
      </div>
      
      <!-- STEP 4 -->
      <div class="tutorial-card">
        <div class="tutorial-img-placeholder">🏢</div>
        <div class="tutorial-content">
          <span class="tutorial-step-badge">Passo 4</span>
          <h3>Controle de Patrimônio</h3>
          <p>Tenha todos os ativos da igreja registrados sistematicamente, com relatórios exatos para os conselhos fiscais.</p>
          <ul>
            <li>Acesse a opção <b>Patrimônio</b></li>
            <li>Clique em <b>+ Novo Item</b></li>
            <li>O sistema gera um Código Automático e único em ouro</li>
            <li>Insira o valor, a localização e registre o equipamento</li>
          </ul>
        </div>
      </div>
      
    </div>
  `);
}
