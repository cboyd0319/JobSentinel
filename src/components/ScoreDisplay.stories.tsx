import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScoreDisplay, ScoreBar } from "./ScoreDisplay";

const meta = {
  title: "Components/ScoreDisplay",
  component: ScoreDisplay,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    score: {
      control: { type: "range", min: 0, max: 1, step: 0.01 },
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    showLabel: { control: "boolean" },
  },
} satisfies Meta<typeof ScoreDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HighScore: Story = {
  args: {
    score: 0.95,
    showLabel: true,
  },
};

export const GoodScore: Story = {
  args: {
    score: 0.75,
    showLabel: true,
  },
};

export const AverageScore: Story = {
  args: {
    score: 0.55,
    showLabel: true,
  },
};

export const LowScore: Story = {
  args: {
    score: 0.35,
    showLabel: true,
  },
};

export const Small: Story = {
  args: {
    score: 0.85,
    size: "sm",
  },
};

export const Large: Story = {
  args: {
    score: 0.85,
    size: "lg",
    showLabel: true,
  },
};

export const NoLabel: Story = {
  args: {
    score: 0.85,
    showLabel: false,
  },
};

// ScoreBar story
export const Bar: Story = {
  args: {
    score: 0.75,
  },
  render: (args) => <ScoreBar score={args.score} />,
};

export const AllScoreRanges: Story = {
  args: { score: 0.5 },
  render: () => (
    <div className="space-y-4 w-64">
      <div>
        <p className="text-sm text-surface-500 mb-2">Excellent (90%+)</p>
        <ScoreDisplay score={0.95} showLabel />
      </div>
      <div>
        <p className="text-sm text-surface-500 mb-2">Good (70-89%)</p>
        <ScoreDisplay score={0.80} showLabel />
      </div>
      <div>
        <p className="text-sm text-surface-500 mb-2">Average (50-69%)</p>
        <ScoreDisplay score={0.60} showLabel />
      </div>
      <div>
        <p className="text-sm text-surface-500 mb-2">Low (&lt;50%)</p>
        <ScoreDisplay score={0.40} showLabel />
      </div>
    </div>
  ),
};
