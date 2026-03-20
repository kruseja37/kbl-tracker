import { Component, type ErrorInfo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface PostGameRouteBoundaryProps {
  children: ReactNode;
  onReturnHome: () => void;
}

interface PostGameRouteBoundaryState {
  hasError: boolean;
}

class PostGameRouteBoundaryInner extends Component<
  PostGameRouteBoundaryProps,
  PostGameRouteBoundaryState
> {
  state: PostGameRouteBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): PostGameRouteBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      "[PostGameRouteBoundary] Failed to render post-game route:",
      error,
      errorInfo,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#081a2b] text-white flex items-center justify-center px-6">
          <div className="w-full max-w-md border-4 border-[#C4A853] bg-[#10273f] shadow-[0_0_32px_rgba(0,0,0,0.45)] p-8 text-center">
            <div className="text-2xl font-bold text-[#F4E7B7]">
              Post-game report unavailable
            </div>
            <div className="mt-3 text-sm text-[#D6E2F0]">
              Something went wrong while loading the final game summary.
            </div>
            <button
              onClick={this.props.onReturnHome}
              className="mt-6 inline-flex items-center justify-center bg-[#C4A853] text-[#10273f] font-bold px-5 py-3 border-2 border-[#F4E7B7] hover:bg-[#D8BC68]"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function PostGameRouteBoundary({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <PostGameRouteBoundaryInner
      onReturnHome={() => {
        try {
          navigate("/");
        } catch (error) {
          console.error(
            "[PostGameRouteBoundary] Failed to navigate home:",
            error,
          );
          window.location.assign("/");
        }
      }}
    >
      {children}
    </PostGameRouteBoundaryInner>
  );
}
