import { signIn, resetPassword } from '../lib/auth.js';
import { $, showToast } from '../lib/utils.js';

const VERSES = [
  { text: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.", ref: "João 3:16" },
  { text: "Tudo posso naquele que me fortalece.", ref: "Filipenses 4:13" },
  { text: "O Senhor é o meu pastor, nada me faltará.", ref: "Salmos 23:1" },
  { text: "Entregue o seu caminho ao Senhor; confie nele, e ele o fará.", ref: "Salmos 37:5" },
  { text: "Ainda que eu ande pelo vale da sombra da morte, não temerei mal nenhum, porque tu estás comigo.", ref: "Salmos 23:4" },
  { text: "Não fui eu que ordenei a você? Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar.", ref: "Josué 1:9" },
  { text: "Mas os que esperam no Senhor renovarão as forças, subirão com asas como águias...", ref: "Isaías 40:31" },
  { text: "Lancem sobre ele toda a sua ansiedade, porque ele tem cuidado de vocês.", ref: "1 Pedro 5:7" },
  { text: "O choro pode durar uma noite, mas a alegria vem pela manhã.", ref: "Salmos 30:5" },
  { text: "Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.", ref: "Salmos 46:1" },
  { text: "Sabemos que Deus age em todas as coisas para o bem daqueles que o amam...", ref: "Romanos 8:28" },
  { text: "Em paz me deito e logo adormeço, pois só tu, Senhor, me fazes viver em segurança.", ref: "Salmos 4:8" },
  { text: "Consagre ao Senhor tudo o que você faz, e os seus planos serão bem-sucedidos.", ref: "Provérbios 16:3" },
  { text: "Peçam, e lhes será dado; busquem, e encontrarão; batam, e a porta lhes será aberta.", ref: "Mateus 7:7" },
  { text: "Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor...", ref: "Jeremias 29:11" },
  { text: "Deixo a paz a vocês; a minha paz dou a vocês. Não a dou como o mundo a dá...", ref: "João 14:27" },
  { text: "Mil poderão cair ao seu lado; dez mil, à sua direita, mas nada o atingirá.", ref: "Salmos 91:7" },
  { text: "O amor é paciente, o amor é bondoso. Não inveja, não se vangloria, não se orgulha.", ref: "1 Coríntios 13:4" },
  { text: "Alegrem-se na esperança, sejam pacientes na tribulação, perseverem na oração.", ref: "Romanos 12:12" },
  { text: "Instrui o menino no caminho em que deve andar, e até quando envelhecer não se desviará dele.", ref: "Provérbios 22:6" },
  { text: "Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento.", ref: "Provérbios 3:5" },
  { text: "O meu Deus suprirá todas as necessidades de vocês, de acordo com as suas gloriosas riquezas em Cristo Jesus.", ref: "Filipenses 4:19" },
  { text: "Buscai primeiro o reino de Deus, e a sua justiça, e todas estas coisas vos serão acrescentadas.", ref: "Mateus 6:33" },
  { text: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.", ref: "Mateus 11:28" },
  { text: "Aquele que habita no esconderijo do Altíssimo, à sombra do Onipotente descansará.", ref: "Salmos 91:1" },
  { text: "Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.", ref: "Salmos 119:105" },
  { text: "Sejam fortes e corajosos. Não tenham medo nem fiquem apavorados por causa delas...", ref: "Deuteronômio 31:6" },
  { text: "Porque pela graça sois salvos, por meio da fé; e isto não vem de vós, é dom de Deus.", ref: "Efésios 2:8" },
  { text: "O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti...", ref: "Números 6:24-25" },
  { text: "Portanto, se alguém está em Cristo, é nova criação. As coisas antigas já passaram; eis que surgiram coisas novas!", ref: "2 Coríntios 5:17" },
  { text: "Mas o fruto do Espírito é amor, alegria, paz, paciência, amabilidade, bondade, fidelidade...", ref: "Gálatas 5:22" }
];

export function renderLogin(router) {
  const app = $('#app');
  
  const today = new Date();
  const dayOfMonth = today.getDate();
  const verse = VERSES[(dayOfMonth - 1) % VERSES.length];
  
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const fullDate = today.toLocaleDateString('pt-BR', options);
  const formattedDate = fullDate.charAt(0).toUpperCase() + fullDate.slice(1);

  app.innerHTML = `
    <div class="login-page">
      <div class="login-container">
        
        <div class="login-glass-card">
          <div class="login-header">
            <img src="/icons/icon-512.png" alt="Logo" class="login-logo-img" />
            <h1>Control Igreja</h1>
            <p>Sistema de Gestão Integrada</p>
          </div>
          
          <form class="login-form" id="loginForm">
            <div class="form-group">
              <label class="form-label" for="loginEmail">E-mail</label>
              <input type="email" class="form-control" id="loginEmail" placeholder="seu@email.com" required autocomplete="email" />
            </div>
            <div class="form-group">
              <label class="form-label" for="loginPassword">Senha</label>
              <input type="password" class="form-control" id="loginPassword" placeholder="••••••••" required autocomplete="current-password" />
            </div>
            <button type="submit" class="btn btn-primary login-btn" id="loginBtn">
              Entrar
            </button>
          </form>
          
          <div class="login-forgot">
            <a href="#" id="forgotLink">Esqueceu a senha?</a>
          </div>
        </div>

        <div class="login-verse-footer">
          <div class="login-date">${formattedDate}</div>
          <p class="verse-text">"${verse.text}"</p>
          <span class="verse-ref">— ${verse.ref}</span>
        </div>

      </div>
    </div>
  `;

  const form = $('#loginForm');
  const loginBtn = $('#loginBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;

    loginBtn.classList.add('btn-loading');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Entrando...';

    try {
      await signIn(email, password);
      showToast('Login realizado com sucesso!', 'success');
      router.navigate('/dashboard');
    } catch (err) {
      showToast(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : err.message, 'error');
    } finally {
      loginBtn.classList.remove('btn-loading');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Entrar';
    }
  });

  $('#forgotLink').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    if (!email) {
      showToast('Digite seu e-mail primeiro', 'warning');
      return;
    }
    try {
      await resetPassword(email);
      showToast('Link de recuperação enviado para ' + email, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
