import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./Badge";

const meta = {
  title: "Components/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["sentinel", "alert", "surface", "success", "danger"],
    },
    size: {
      control: "select",
      options: ["sm", "md"],
    },
    removable: { control: "boolean" },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Surface: Story = {
  args: {
    children: "Surface Badge",
    variant: "surface",
  },
};

export const Sentinel: Story = {
  args: {
    children: "Sentinel",
    variant: "sentinel",
  },
};

export const Alert: Story = {
  args: {
    children: "Alert",
    variant: "alert",
  },
};

export const Success: Story = {
  args: {
    children: "Success",
    variant: "success",
  },
};

export const Danger: Story = {
  args: {
    children: "Danger",
    variant: "danger",
  },
};

export const Small: Story = {
  args: {
    children: "Small Badge",
    size: "sm",
    variant: "sentinel",
  },
};

export const Removable: Story = {
  args: {
    children: "Removable",
    variant: "sentinel",
    removable: true,
    onRemove: () => console.log("Badge removed"),
  },
};

export const AllVariants: Story = {
  args: {
    children: "Badge",
  },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="surface">Surface</Badge>
      <Badge variant="sentinel">Sentinel</Badge>
      <Badge variant="alert">Alert</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="danger">Danger</Badge>
    </div>
  ),
};
