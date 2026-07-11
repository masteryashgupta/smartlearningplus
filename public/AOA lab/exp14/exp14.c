#include <stdio.h>
#include <string.h>
#include <time.h>

int main()
{
    char text[200], pattern[100];
    int n, m, i, j, found = 0;
    clock_t start, end;
    double cpu_time_used;

    printf("Enter the text string: ");
    scanf("%s", text);
    printf("Enter the pattern to search: ");
    scanf("%s", pattern);

    n = strlen(text);
    m = strlen(pattern);

    // Start timing
    start = clock();

    printf("\nMatching positions (Naive String Matching):\n");
    // Slide the pattern over text one by one
    for(i = 0; i <= n - m; i++)
    {
        for(j = 0; j < m; j++)
        {
            if(text[i + j] != pattern[j])
                break;
        }
        if(j == m)
        {
            printf("Pattern found at index %d\n", i);
            found = 1;
        }
    }

    // End timing
    end = clock();
    cpu_time_used = ((double)(end - start)) / CLOCKS_PER_SEC;

    if(!found)
        printf("Pattern not found in the text\n");

    printf("\nTime Required = %f seconds\n", cpu_time_used);
    return 0;
}
