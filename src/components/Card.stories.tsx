import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardHeader, CardDivider } from "./Card";
import { Button } from "./Button";

const meta = {
  title: "Components/Card",
  component: Card,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className="p-6">
        <h3 className="text-lg font-medium mb-2">Card Title</h3>
        <p className="text-surface-600 dark:text-surface-400">
          This is a basic card with some content inside.
        </p>
      </div>
    ),
  },
};

export const WithHeader: Story = {
  args: {
    children: (
      <>
        <CardHeader
          title="Card with Header"
          subtitle="This card has a header component"
          action={<Button size="sm">Action</Button>}
        />
        <CardDivider />
        <div className="p-6">
          <p className="text-surface-600 dark:text-surface-400">
            Card content goes here. The header provides a consistent look.
          </p>
        </div>
      </>
    ),
  },
};

export const Interactive: Story = {
  args: {
    hover: true,
    children: (
      <div className="p-6">
        <h3 className="text-lg font-medium mb-2">Interactive Card</h3>
        <p className="text-surface-600 dark:text-surface-400">
          Hover over this card to see the effect.
        </p>
      </div>
    ),
  },
};

export const WithStats: Story = {
  args: {
    className: "max-w-sm",
    children: (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-surface-900 dark:text-white">
            Job Statistics
          </h3>
          <span className="text-xs text-surface-500">Today</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold text-surface-900 dark:text-white">
              127
            </p>
            <p className="text-sm text-surface-500">Total Jobs</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">23</p>
            <p className="text-sm text-surface-500">High Match</p>
          </div>
        </div>
      </div>
    ),
  },
};
