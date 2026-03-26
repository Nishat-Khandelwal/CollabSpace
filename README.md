**CollabSpace** is a dynamic, collaborative workspace that combines a powerful real-time whiteboard with synchronized team chat. 

## Features
- **Real-time Drawing**: Draw, sketch, and design fluidly with zero-latency synchronization across all connected clients.
- **Chat Sync**: Communicate with your team in real-time alongside your whiteboard with our integrated, synchronized chat system.
- **Collaborative Board**: Multiple users can join the same board simultaneously, allowing for true multiplayer collaboration and brainstorming.
- **AI Workspace Assistant (Bot)**:
    An intelligent AI bot integrated directly into the workspace to help generate ideas,
    manipulate canvas elements (such as drawing or resizing shapes based on prompts),
    and assist with real-time problem-solving alongside your team.

## Tech Stack
CollabSpace is built using modern web technologies to ensure a fast, responsive, and seamless experience:
- **Frontend**: React.js
- **Backend**: Node.js & Express
- **Real-time Communication**: Socket.io
- **AI Integration**: Gemini AI 
- **Canvas/Drawing**: HTML5 Canvas API

### Prerequisites
Make sure you have Node.js installed on your machine.
- Node.js (v14 or higher recommended)
- npm or yarn
### Installation
1. **Clone the repository**
   ```bash
  git clone https://github.com/Nishat-Khandelwal/CollabSpace.git
  cd CollabSpace

# Install client
cd client
npm install

# Install server
cd ../server
npm install

# Run server
npm start

# Run client (new terminal)
cd client
npm run dev
