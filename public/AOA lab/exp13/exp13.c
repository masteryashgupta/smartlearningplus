#include <stdio.h>
#include <stdlib.h>
#include <time.h>

int board[20];
int n;
int solutionCount = 0;

// Check if it is safe to place a queen at board[row] = col
int isSafe(int row, int col)
{
    int i;
    for(i = 0; i < row; i++)
    {
        if(board[i] == col || abs(board[i] - col) == abs(i - row))
            return 0;
    }
    return 1;
}

// Print one solution
void printSolution()
{
    int i, j;
    solutionCount++;
    printf("\nSolution %d:\n", solutionCount);
    for(i = 0; i < n; i++)
    {
        for(j = 0; j < n; j++)
        {
            if(board[i] == j)
                printf("Q ");
            else
                printf(". ");
        }
        printf("\n");
    }
}

// Solve using backtracking
void solveNQueen(int row)
{
    if(row == n)
    {
        printSolution();
        return;
    }
    int col;
    for(col = 0; col < n; col++)
    {
        if(isSafe(row, col))
        {
            board[row] = col;
            solveNQueen(row + 1);
            // Backtrack (implicit, next iteration overwrites board[row])
        }
    }
}

int main()
{
    clock_t start, end;
    double cpu_time_used;

    printf("Enter number of queens (N): ");
    scanf("%d", &n);

    // Start timing
    start = clock();

    solveNQueen(0);

    // End timing
    end = clock();
    cpu_time_used = ((double)(end - start)) / CLOCKS_PER_SEC;

    printf("\nTotal solutions for %d-Queens = %d\n", n, solutionCount);
    printf("\nTime Required = %f seconds\n", cpu_time_used);
    return 0;
}
