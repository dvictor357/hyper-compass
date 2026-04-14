"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center">
            <div className="text-[#4488ff] font-mono text-sm mb-2">WebGL Required</div>
            <div className="text-[#e0e6f0]/40 font-mono text-xs">
              Open in a browser with WebGL support to view the 3D network
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
