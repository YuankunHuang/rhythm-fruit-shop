#pragma once

#include "../app/IGameState.h"
#include "../platform/IRenderer.h"
#include "../app/StateStack.h"

namespace rfs {
	class MainMenuState : public IGameState {
	public:
		explicit MainMenuState(IRenderer& renderer, StateStack& stack);

		void Update(const FrameContext& ctx) override;
		void Render() override;
		void HandleInput(const InputEvent& evt) override;
	private:
		IRenderer& renderer_;
		StateStack& stack_; // need this to push the next state when the player starts the game
	};
}