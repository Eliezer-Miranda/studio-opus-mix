# Midnight Mixer Pro

"Atue como um designer de UI/UX especializado em aplicações profissionais de áudio (Pro Audio/DAW).

Crie um dashboard moderno e responsivo para um Mixer Digital de Monitoramento (Monitor Console) usando React, Tailwind CSS e Shadcn UI.

O layout deve conter:

Sidebar à esquerda: Com uma lista de músicos/buses (ex: Bateria, Baixo, Vozes, Pastor) com estados ativos (highlight visual).

Área central (Grid): Um mixer grid que exibe canais verticais.

Componentes de Canal (Channel Strip): Cada canal deve ter:

Um slider vertical customizado (fader) com trilha e 'thumb' moderna.

Um botão de Mute e Solo com indicadores de estado (LED lights).

Um knob rotativo (círculo) para controle de PAN (somente visível em instrumentos ao vivo, não em canais de backing track).

Display de valor numérico abaixo do fader.

Nome do canal com tipografia técnica (monospaced).

Estética e Estilo:

Tema: Dark Mode profundo (estilo 'Midnight Studio'). Cores de fundo em tons de cinza escuro (#0f172a / slate-900).

Acentos: Use cores de status vibrantes (Verde neon para faders de nível, Azul ciano para Pan, Laranja/Âmbar para Master).

UI: Design limpo, minimalista, estilo 'glassmorphism' suave nos cards.

Interatividade: Os faders devem ter uma resposta visual suave ao arrastar. Use ícones da biblioteca Lucide React.

Responsividade: Deve funcionar perfeitamente em telas de tablets (iPad) e desktops, com a sidebar colapsando ou tornando-se um menu horizontal em dispositivos móveis.

Requisito Técnico: O código deve estar estruturado de forma que eu possa facilmente conectar os estados (volume, pan, mute) via props ou socket.io posteriormente."

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://studio-opus-mix.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/abaf99f8-3c55-42cb-8bb2-18edd9d9d59d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
