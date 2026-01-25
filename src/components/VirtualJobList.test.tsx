import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, renderHook, act } from "@testing-library/react";
import { VirtualJobList, useVirtualListScroll } from "./VirtualJobList";
import { AnnouncerProvider } from "../contexts/AnnouncerContext";
import { ReactNode } from "react";

// Wrapper for AnnouncerProvider
const Wrapper = ({ children }: { children: ReactNode }) => (
  <AnnouncerProvider>{children}</AnnouncerProvider>
);

// Mock JobCard component
vi.mock("./JobCard", () => ({
  JobCard: vi.fn(({ job }: { job: { id: number; title: string } }) => (
    <div data-testid={`job-card-${job.id}`}>{job.title}</div>
  )),
}));

// Mock react-window
const mockScrollToRow = vi.fn();
const mockListRef = { current: { scrollToRow: mockScrollToRow } };

vi.mock("react-window", () => ({
  List: vi.fn(({ rowCount, rowComponent: RowComponent, rowProps, ...rest }) => (
    <div data-testid="virtual-list" {...rest}>
      {Array.from({ length: Math.min(rowCount, 5) }, (_, index) => (
        <RowComponent
          key={index}
          index={index}
          style={{ top: index * 160, height: 160, position: "absolute" }}
          {...rowProps}
        />
      ))}
    </div>
  )),
  useListRef: vi.fn(() => mockListRef),
}));

describe("VirtualJobList", () => {
  const createJob = (id: number) => ({
    id,
    title: `Job ${id}`,
    company: `Company ${id}`,
    location: "Remote",
    url: `https://example.com/job/${id}`,
    source: "linkedin",
    score: 0.85,
    created_at: new Date().toISOString(),
  });

  const defaultProps = {
    jobs: [createJob(1), createJob(2), createJob(3)],
    onHideJob: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("non-virtualized rendering (≤10 jobs)", () => {
    it("renders jobs without virtualization when 10 or fewer", () => {
      render(<VirtualJobList {...defaultProps} />, { wrapper: Wrapper });

      expect(screen.getByRole("list")).toBeInTheDocument();
      expect(screen.queryByTestId("virtual-list")).not.toBeInTheDocument();
    });

    it("renders all job cards", () => {
      render(<VirtualJobList {...defaultProps} />, { wrapper: Wrapper });

      expect(screen.getByTestId("job-card-1")).toBeInTheDocument();
      expect(screen.getByTestId("job-card-2")).toBeInTheDocument();
      expect(screen.getByTestId("job-card-3")).toBeInTheDocument();
    });

    it("displays job titles", () => {
      render(<VirtualJobList {...defaultProps} />, { wrapper: Wrapper });

      expect(screen.getByText("Job 1")).toBeInTheDocument();
      expect(screen.getByText("Job 2")).toBeInTheDocument();
      expect(screen.getByText("Job 3")).toBeInTheDocument();
    });

    it("has aria-label on list", () => {
      render(<VirtualJobList {...defaultProps} />, { wrapper: Wrapper });

      expect(screen.getByRole("list")).toHaveAttribute(
        "aria-label",
        "Job listings"
      );
    });

    it("renders with 10 jobs without virtualization", () => {
      const jobs = Array.from({ length: 10 }, (_, i) => createJob(i + 1));
      render(<VirtualJobList jobs={jobs} onHideJob={vi.fn()} />, { wrapper: Wrapper });

      expect(screen.queryByTestId("virtual-list")).not.toBeInTheDocument();
      expect(screen.getAllByTestId(/job-card-/)).toHaveLength(10);
    });
  });

  describe("virtualized rendering (>10 jobs)", () => {
    const manyJobs = Array.from({ length: 50 }, (_, i) => createJob(i + 1));

    it("uses virtualized list when more than 10 jobs", () => {
      render(<VirtualJobList jobs={manyJobs} onHideJob={vi.fn()} />, { wrapper: Wrapper });

      expect(screen.getByTestId("virtual-list")).toBeInTheDocument();
    });

    it("has role list on virtualized container", () => {
      render(<VirtualJobList jobs={manyJobs} onHideJob={vi.fn()} />, { wrapper: Wrapper });

      expect(screen.getByTestId("virtual-list")).toHaveAttribute("role", "list");
    });

    it("has aria-label with job count on virtualized list", () => {
      render(<VirtualJobList jobs={manyJobs} onHideJob={vi.fn()} />, { wrapper: Wrapper });

      expect(screen.getByTestId("virtual-list")).toHaveAttribute(
        "aria-label",
        "50 job listings"
      );
    });

    it("renders visible rows", () => {
      render(<VirtualJobList jobs={manyJobs} onHideJob={vi.fn()} />, { wrapper: Wrapper });

      // Mock renders first 5 items
      expect(screen.getByTestId("job-card-1")).toBeInTheDocument();
      expect(screen.getByTestId("job-card-5")).toBeInTheDocument();
    });

    it("passes jobs to row component", () => {
      render(<VirtualJobList jobs={manyJobs} onHideJob={vi.fn()} />, { wrapper: Wrapper });

      expect(screen.getByText("Job 1")).toBeInTheDocument();
    });
  });

  describe("props", () => {
    const manyJobs = Array.from({ length: 20 }, (_, i) => createJob(i + 1));

    it("accepts custom height", () => {
      render(
        <VirtualJobList jobs={manyJobs} onHideJob={vi.fn()} height={500} />,
        { wrapper: Wrapper }
      );

      // Virtual list should render
      expect(screen.getByTestId("virtual-list")).toBeInTheDocument();
    });

    it("accepts custom itemHeight", () => {
      render(
        <VirtualJobList jobs={manyJobs} onHideJob={vi.fn()} itemHeight={200} />,
        { wrapper: Wrapper }
      );

      expect(screen.getByTestId("virtual-list")).toBeInTheDocument();
    });

    it("passes onHideJob to JobCard", async () => {
      const onHideJob = vi.fn();
      render(<VirtualJobList {...defaultProps} onHideJob={onHideJob} />, { wrapper: Wrapper });

      // JobCard receives onHideJob prop (verified via mock)
      const { JobCard } = await import("./JobCard");
      const mockedJobCard = vi.mocked(JobCard);
      expect(mockedJobCard).toHaveBeenCalledWith(
        expect.objectContaining({ onHideJob }),
        undefined
      );
    });
  });

  describe("empty state", () => {
    it("renders empty list when no jobs", () => {
      render(<VirtualJobList jobs={[]} onHideJob={vi.fn()} />, { wrapper: Wrapper });

      const list = screen.getByRole("list");
      expect(list).toBeInTheDocument();
      expect(list.children).toHaveLength(0);
    });
  });

  describe("job data", () => {
    it("handles jobs with optional fields", () => {
      const jobWithOptionals = {
        ...createJob(1),
        description: "Test description",
        salary_min: 100000,
        salary_max: 150000,
        remote: true,
      };

      render(<VirtualJobList jobs={[jobWithOptionals]} onHideJob={vi.fn()} />, { wrapper: Wrapper });

      expect(screen.getByTestId("job-card-1")).toBeInTheDocument();
    });

    it("handles jobs with null location", () => {
      const jobWithNullLocation = {
        ...createJob(1),
        location: null,
      };

      render(<VirtualJobList jobs={[jobWithNullLocation]} onHideJob={vi.fn()} />, { wrapper: Wrapper });

      expect(screen.getByTestId("job-card-1")).toBeInTheDocument();
    });
  });
});

describe("useVirtualListScroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns listRef and scrollToJob", () => {
    const { result } = renderHook(() => useVirtualListScroll());

    expect(result.current).toHaveProperty("listRef");
    expect(result.current).toHaveProperty("scrollToJob");
    expect(typeof result.current.scrollToJob).toBe("function");
  });

  it("scrollToJob calls scrollToRow with correct params", () => {
    const { result } = renderHook(() => useVirtualListScroll());

    act(() => {
      result.current.scrollToJob(5);
    });

    expect(mockScrollToRow).toHaveBeenCalledWith({ index: 5, align: "center" });
  });

  it("scrollToJob accepts custom align parameter", () => {
    const { result } = renderHook(() => useVirtualListScroll());

    act(() => {
      result.current.scrollToJob(10, "start");
    });

    expect(mockScrollToRow).toHaveBeenCalledWith({ index: 10, align: "start" });
  });

  it("scrollToJob handles end alignment", () => {
    const { result } = renderHook(() => useVirtualListScroll());

    act(() => {
      result.current.scrollToJob(3, "end");
    });

    expect(mockScrollToRow).toHaveBeenCalledWith({ index: 3, align: "end" });
  });

  it("scrollToJob handles auto alignment", () => {
    const { result } = renderHook(() => useVirtualListScroll());

    act(() => {
      result.current.scrollToJob(7, "auto");
    });

    expect(mockScrollToRow).toHaveBeenCalledWith({ index: 7, align: "auto" });
  });
});

describe("JobRow", () => {
  // JobRow is tested indirectly through VirtualJobList
  // These tests verify the row component behavior

  it("renders job content in correct position", () => {
    const manyJobs = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      title: `Position ${i + 1}`,
      company: `Corp ${i + 1}`,
      location: "NYC",
      url: `https://example.com/${i + 1}`,
      source: "indeed",
      score: 0.9,
      created_at: new Date().toISOString(),
    }));

    render(<VirtualJobList jobs={manyJobs} onHideJob={vi.fn()} />, { wrapper: Wrapper });

    // First row should be visible
    expect(screen.getByText("Position 1")).toBeInTheDocument();
  });
});
